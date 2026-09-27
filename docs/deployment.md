# Deployment

Local development uses `docker compose up --build`. For GCP, deploy `backend-go` and `ml-service` independently to Cloud Run using the manifests in `infra/gcp/`. Provide service URLs and secrets through Secret Manager/environment configuration, not committed files.

Before production integration, verify the official access and operational status of P-Care, V-Claim, SISRUTE, ASPAK, SIRANAP, and SISDMK with their data owners.
