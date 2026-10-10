#!/usr/bin/env bash
# One-time GCP bootstrap for SIRUJUK. Safe to re-run. Needs: gcloud (project owner), gh (repo admin), openssl.
#   PROJECT_ID=my-proj REDIS_URL='rediss://default:pw@host:6379' [REGION=us-east4] [BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX] ./infra/gcp/setup.sh
set -euo pipefail
: "${PROJECT_ID:?}" "${REDIS_URL:?rediss:// URL, e.g. Upstash free tier}"
REGION=${REGION:-us-east4} # Tier-1 pricing, ~1 ms from Vercel iad1
REPO=${REPO:-adyuta447/sirujuk}
P=$PROJECT_ID
export CLOUDSDK_CORE_PROJECT="$P" # this shell only: do not change the caller's default gcloud project
SA() { echo "sirujuk-$1@$P.iam.gserviceaccount.com"; }
PN=$(gcloud projects describe "$P" --format='value(projectNumber)')

gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com \
  iam.googleapis.com firestore.googleapis.com iamcredentials.googleapis.com sts.googleapis.com cloudresourcemanager.googleapis.com billingbudgets.googleapis.com

# Registry: free up to 0.5 GB, so keep only the 2 newest images per repo path and drop anything older than 7 days.
gcloud artifacts repositories describe sirujuk --location "$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create sirujuk --repository-format=docker --location "$REGION"
policy=$(mktemp)
cat >"$policy" <<'EOF'
[{"name":"keep-newest","action":{"type":"Keep"},"mostRecentVersions":{"keepCount":2}},
 {"name":"drop-old","action":{"type":"Delete"},"condition":{"tagState":"any","olderThan":"604800s"}}]
EOF
gcloud artifacts repositories set-cleanup-policies sirujuk --location "$REGION" --policy "$policy" --no-dry-run

# Service accounts: the deployer only deploys; each runtime account gets only what its service reads.
for s in deployer backend ml; do
  gcloud iam service-accounts describe "$(SA $s)" >/dev/null 2>&1 || gcloud iam service-accounts create "sirujuk-$s"
done

# Login accounts live in Firestore (generous free tier). The database location cannot be changed once created.
gcloud firestore databases describe --database='(default)' >/dev/null 2>&1 ||
  gcloud firestore databases create --location "$REGION" --type firestore-native
gcloud projects add-iam-policy-binding "$P" --member "serviceAccount:$(SA backend)" \
  --role roles/datastore.user --condition=None >/dev/null

# Secrets. API_TOKEN is generated here and never printed; REDIS_URL comes from the environment.
gcloud secrets describe sirujuk-api-token >/dev/null 2>&1 ||
  openssl rand -hex 32 | tr -d '\n' | gcloud secrets create sirujuk-api-token --data-file=-
gcloud secrets describe sirujuk-stream-key >/dev/null 2>&1 || # encrypts queued referrals in Redis; created once, never overwritten
  openssl rand -hex 32 | tr -d '\n' | gcloud secrets create sirujuk-stream-key --data-file=-
gcloud secrets describe sirujuk-redis-url >/dev/null 2>&1 || gcloud secrets create sirujuk-redis-url
printf %s "$REDIS_URL" | gcloud secrets versions add sirujuk-redis-url --data-file=-
for sec in sirujuk-api-token sirujuk-redis-url sirujuk-stream-key; do
  gcloud secrets add-iam-policy-binding "$sec" --member "serviceAccount:$(SA backend)" --role roles/secretmanager.secretAccessor >/dev/null
done

# Placeholder services so per-service IAM can be bound now; the pipeline replaces them on first deploy.
for s in ml backend; do
  gcloud run services describe "sirujuk-$s" --region "$REGION" >/dev/null 2>&1 ||
    gcloud run deploy "sirujuk-$s" --region "$REGION" --image us-docker.pkg.dev/cloudrun/container/hello \
      --service-account "$(SA $s)" --no-allow-unauthenticated --max-instances 1 --quiet
  gcloud run services add-iam-policy-binding "sirujuk-$s" --region "$REGION" \
    --member "serviceAccount:$(SA deployer)" --role roles/run.developer >/dev/null
  gcloud iam service-accounts add-iam-policy-binding "$(SA $s)" \
    --member "serviceAccount:$(SA deployer)" --role roles/iam.serviceAccountUser >/dev/null
done
gcloud artifacts repositories add-iam-policy-binding sirujuk --location "$REGION" \
  --member "serviceAccount:$(SA deployer)" --role roles/artifactregistry.writer >/dev/null
# ml is private: only the backend may call it. The backend is public, guarded by the API_TOKEN bearer.
gcloud run services add-iam-policy-binding sirujuk-ml --region "$REGION" \
  --member "serviceAccount:$(SA backend)" --role roles/run.invoker >/dev/null
gcloud run services add-iam-policy-binding sirujuk-backend --region "$REGION" \
  --member allUsers --role roles/run.invoker >/dev/null

# GitHub -> GCP without keys: only this repo (by immutable id), only refs/heads/main, may impersonate the deployer.
RID=$(gh api "repos/$REPO" --jq .id)
gcloud iam workload-identity-pools describe github --location global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create github --location global
gcloud iam workload-identity-pools providers describe actions --location global --workload-identity-pool github >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc actions --location global --workload-identity-pool github \
    --issuer-uri https://token.actions.githubusercontent.com \
    --attribute-mapping 'google.subject=assertion.sub,attribute.repository_id=assertion.repository_id' \
    --attribute-condition "assertion.repository_id=='$RID' && assertion.ref=='refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding "$(SA deployer)" --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/$PN/locations/global/workloadIdentityPools/github/attribute.repository_id/$RID" >/dev/null

# Budget alert (email only, it does not cap spend; the instance caps in the Cloud Run manifests do that).
if [ -n "${BILLING_ACCOUNT:-}" ] && [ -z "$(gcloud billing budgets list --billing-account "$BILLING_ACCOUNT" --filter 'displayName=sirujuk' --format 'value(name)')" ]; then
  gcloud billing budgets create --billing-account "$BILLING_ACCOUNT" --display-name sirujuk \
    --budget-amount "${BUDGET_USD:-5}USD" --filter-projects "projects/$P" \
    --threshold-rule percent=0.5 --threshold-rule percent=1.0
fi

gh variable set GCP_PROJECT_ID --repo "$REPO" --body "$P"
gh variable set GCP_REGION --repo "$REPO" --body "$REGION"
gh variable set GCP_DEPLOY_SA --repo "$REPO" --body "$(SA deployer)"
gh variable set GCP_WIF_PROVIDER --repo "$REPO" --body "projects/$PN/locations/global/workloadIdentityPools/github/providers/actions"
echo "GCP ready. Next: docs/deploy.md step 3 (Vercel)."
