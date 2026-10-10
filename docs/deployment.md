# Deployment

The step by step guides live in two places. [install.md](install.md) covers running Sirujuk locally, every environment variable, and the first cloud deployment. [devops.md](devops.md) covers the pipeline, how to roll back, and the test results from the last release.

In short: local development uses `docker compose up --build`. In the cloud, `backend-go` and `ml-service` run on Cloud Run from the manifests in `infra/gcp/`, and the frontend runs on Vercel. Service URLs and secrets come from Secret Manager and environment configuration, never from committed files.

Before production integration, verify the official access and operational status of P-Care, V-Claim, SISRUTE, ASPAK, SIRANAP, and SISDMK with their data owners.
