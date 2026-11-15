#!/usr/bin/env bash
# Redis for the backend on a private e2-micro VM (~US$7/month vs ~US$36 for Memorystore Basic 1 GB). Safe to re-run.
# No public IP: Cloud Run reaches it through Direct VPC egress (infra/gcp/cloudrun-go.yaml), the VM pulls its image
# from Artifact Registry and its password from Secret Manager through Private Google Access.
#   PROJECT_ID=my-proj [REGION=us-east4] ./infra/gcp/redis-vm.sh
# shortcut: one VM, no replica; a VM restart loses at most 1 s of writes (AOF). Move to Memorystore when an SLA is needed.
set -euo pipefail
: "${PROJECT_ID:?}"
REGION=${REGION:-us-east4}
ZONE=${ZONE:-$REGION-a}
P=$PROJECT_ID
export CLOUDSDK_CORE_PROJECT="$P"
SA=sirujuk-redis@$P.iam.gserviceaccount.com
IMAGE=$REGION-docker.pkg.dev/$P/sirujuk/redis:7-alpine
cd "$(dirname "$0")/../.."

gcloud services enable compute.googleapis.com
gcloud compute networks describe default >/dev/null 2>&1 || gcloud compute networks create default --subnet-mode auto
gcloud compute firewall-rules describe default-allow-internal >/dev/null 2>&1 ||
  gcloud compute firewall-rules create default-allow-internal --network default --source-ranges 10.128.0.0/9 --allow tcp,udp,icmp
gcloud compute networks subnets update default --region "$REGION" --enable-private-ip-google-access

# Mirror the image: the VM has no internet route, only Google APIs.
docker pull --platform linux/amd64 redis:7-alpine
docker tag redis:7-alpine "$IMAGE"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet
docker push "$IMAGE"

gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 || gcloud iam service-accounts create sirujuk-redis
gcloud artifacts repositories add-iam-policy-binding sirujuk --location "$REGION" \
  --member "serviceAccount:$SA" --role roles/artifactregistry.reader >/dev/null
gcloud secrets describe sirujuk-redis-password >/dev/null 2>&1 ||
  openssl rand -hex 24 | tr -d '\n' | gcloud secrets create sirujuk-redis-password --data-file=-
gcloud secrets add-iam-policy-binding sirujuk-redis-password --member "serviceAccount:$SA" \
  --role roles/secretmanager.secretAccessor >/dev/null

# Direct VPC egress: the deployer (GitHub pipeline) must be allowed to attach the backend to this subnet.
gcloud projects add-iam-policy-binding "$P" --member "serviceAccount:sirujuk-deployer@$P.iam.gserviceaccount.com" \
  --role roles/compute.networkViewer --condition=None >/dev/null
gcloud compute networks subnets add-iam-policy-binding default --region "$REGION" \
  --member "serviceAccount:sirujuk-deployer@$P.iam.gserviceaccount.com" --role roles/compute.networkUser >/dev/null

gcloud compute addresses describe sirujuk-redis --region "$REGION" >/dev/null 2>&1 ||
  gcloud compute addresses create sirujuk-redis --region "$REGION" --subnet default
IP=$(gcloud compute addresses describe sirujuk-redis --region "$REGION" --format 'value(address)')

# TLS: the wire carries the Redis password, login counters and sealed patient data. One self-signed certificate for
# this VM's fixed internal IP, created once; the backend trusts exactly this certificate (REDIS_CA_CERT), nothing else.
if ! gcloud secrets describe sirujuk-redis-tls-key >/dev/null 2>&1; then
  tls=$(mktemp -d)
  trap 'rm -rf "$tls"' EXIT
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:prime256v1 -nodes -days 3650 -subj /CN=sirujuk-redis \
    -addext "subjectAltName=IP:$IP" -addext "basicConstraints=critical,CA:FALSE" -addext "extendedKeyUsage=serverAuth" \
    -keyout "$tls/server.key" -out "$tls/server.crt"
  gcloud secrets describe sirujuk-redis-ca >/dev/null 2>&1 || gcloud secrets create sirujuk-redis-ca
  gcloud secrets versions add sirujuk-redis-ca --data-file="$tls/server.crt"
  gcloud secrets create sirujuk-redis-tls-key --data-file="$tls/server.key"
fi
for sec in sirujuk-redis-tls-key sirujuk-redis-ca; do
  gcloud secrets add-iam-policy-binding "$sec" --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor >/dev/null
done
gcloud secrets add-iam-policy-binding sirujuk-redis-ca --member "serviceAccount:sirujuk-backend@$P.iam.gserviceaccount.com" \
  --role roles/secretmanager.secretAccessor >/dev/null

init=$(mktemp)
cat >"$init" <<EOF
#cloud-config
write_files:
  - path: /etc/redis/base.conf
    permissions: "0644"
    content: |
$(sed 's/^/      /' infra/redis/redis.conf)
  - path: /etc/redis/boot.sh
    permissions: "0755"
    content: |
      set -eu
      H='Metadata-Flavor: Google'; M=http://metadata.google.internal/computeMetadata/v1
      T=\$(curl -sf -H "\$H" \$M/instance/service-accounts/default/token | sed -E 's/.*"access_token":"([^"]+)".*/\1/')
      sec() { curl -sf -H "Authorization: Bearer \$T" https://secretmanager.googleapis.com/v1/projects/$P/secrets/\$1/versions/latest:access | sed -nE 's/.*"data": *"([^"]+)".*/\1/p' | base64 -d; }
      PW=\$(sec sirujuk-redis-password)
      mkdir -p /run/redis-tls
      sec sirujuk-redis-ca > /run/redis-tls/server.crt
      sec sirujuk-redis-tls-key > /run/redis-tls/server.key
      chown -R 999:999 /run/redis-tls && chmod 600 /run/redis-tls/server.key # 999 = the image's redis user
      # TLS only: port 0 closes the plaintext port. Clients are not asked for certificates; the password authenticates them.
      { cat /etc/redis/base.conf; echo "requirepass \$PW"; printf '%s\n' 'port 0' 'tls-port 6379' 'tls-cert-file /tls/server.crt' 'tls-key-file /tls/server.key' 'tls-ca-cert-file /tls/server.crt' 'tls-auth-clients no'; } > /run/redis.conf
      chmod 644 /run/redis.conf
      mkdir -p /var/lib/redis /home/redis-svc
      # COS host firewall drops all inbound but SSH; let the VPC (Cloud Run Direct VPC egress) in.
      iptables -C INPUT -p tcp --dport 6379 -s 10.128.0.0/9 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 6379 -s 10.128.0.0/9 -j ACCEPT
      docker-credential-gcr configure-docker --registries=$REGION-docker.pkg.dev
  - path: /etc/systemd/system/redis.service
    permissions: "0644"
    content: |
      [Unit]
      Wants=network-online.target
      After=network-online.target docker.service
      [Service]
      Environment=HOME=/home/redis-svc
      ExecStartPre=/bin/sh /etc/redis/boot.sh
      ExecStartPre=-/usr/bin/docker rm -f redis
      ExecStart=/usr/bin/docker run --rm --name redis --network host -v /var/lib/redis:/data -v /run/redis.conf:/usr/local/etc/redis/redis.conf:ro -v /run/redis-tls:/tls:ro $IMAGE redis-server /usr/local/etc/redis/redis.conf
      ExecStop=/usr/bin/docker stop redis
      Restart=always
      RestartSec=5
runcmd:
  - systemctl daemon-reload
  - systemctl start redis.service
EOF

if gcloud compute instances describe sirujuk-redis --zone "$ZONE" >/dev/null 2>&1; then
  gcloud compute instances add-metadata sirujuk-redis --zone "$ZONE" --metadata-from-file user-data="$init"
  # Apply it now (about a minute without Redis; the backend runs degraded meanwhile): REDIS_URL turns rediss:// below.
  gcloud compute instances reset sirujuk-redis --zone "$ZONE"
else
  gcloud compute instances create sirujuk-redis --zone "$ZONE" --machine-type e2-micro \
    --image-family cos-stable --image-project cos-cloud --boot-disk-size 10GB --boot-disk-type pd-standard \
    --subnet default --private-network-ip "$IP" --no-address --service-account "$SA" --scopes cloud-platform \
    --shielded-secure-boot --metadata-from-file user-data="$init"
fi

PW=$(gcloud secrets versions access latest --secret sirujuk-redis-password)
printf %s "rediss://:$PW@$IP:6379/0" | gcloud secrets versions add sirujuk-redis-url --data-file=-
echo "Redis at $IP. Redeploy the backend (pipeline or gcloud run services replace) to pick up the new REDIS_URL."
