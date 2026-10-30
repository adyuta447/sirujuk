# DevOps notes and test results

This page explains how Sirujuk is deployed, how a change gets from a pull request to production, and what we actually checked along the way. Every number here was measured on 10 October 2026 against the real deployment. Where something could not be tested, it says so.

For installation and environment variables, read [install.md](install.md). The security review has its own page, [security.md](security.md), and the per service guides are [backend.md](backend.md) and [frontend.md](frontend.md). The older Indonesian runbook is [deploy.md](deploy.md).

## How it fits together

| Piece | Where it runs | Who can reach it |
|:--|:--|:--|
| Frontend | Vercel, https://sirujuk.vercel.app | Anyone can open the landing page and the sign in pages. Everything else needs a session |
| Backend (Go) | Cloud Run, service `sirujuk-backend`, region us-east4 | The URL is public, every API call needs the bearer token |
| ML service (Python) | Cloud Run, service `sirujuk-ml`, region us-east4 | Nobody from the internet. Only the backend service account may call it |
| Accounts and referrals | Firestore, default database, us-east4 | Only the backend service account |
| Secrets | Google Secret Manager | Only the backend service account |
| Images | Artifact Registry, keeps the two newest per image | Deployer and Cloud Run |
| Redis | Placeholder for now, see the gaps at the end | Backend |

A request takes this path: browser, then the Next.js server on Vercel, then the Go backend, then the ML service. The Next.js server holds the API token and adds it to every call, so the browser never sees it. The backend calls the private ML service with a Google ID token that it fetches from the Cloud Run metadata server, so there is no ML password to leak.

Cloud Run limits are set in `infra/gcp/*.yaml`. The backend scales from 0 to 1 instance with 256 MiB for now, because referral state is cached per instance (see S12 in [security.md](security.md)). Raise it once the versioned writes are deployed and tested with two instances. The ML service scales from 0 to 2 instances with 1 GiB each. Those caps are also the cost guard if someone hammers the public URL.

## How a change reaches production

A pull request runs the checks only. It gets no cloud credentials at all. A push to `main` runs the same checks and then deploys. The workflow is `.github/workflows/deploy.yml`, and the stages are:

1. Three jobs run in parallel: backend, ML and frontend (details in the next section).
2. If all three pass, `deploy-gcp` logs in to Google Cloud without any key file. It uses Workload Identity Federation, which hands out short lived tokens, and the trust is limited to this repository on the `main` branch.
3. It builds the ML image and the backend image, pushes them, and deploys them by digest rather than by tag, so what runs is exactly what was built.
4. The ML service goes first, then the backend, because the backend needs the ML address.
5. It calls `/health` on the new backend and fails the run if it does not answer.
6. Vercel notices the push by itself and builds the frontend. The pipeline has a CLI based frontend job too, but it only runs when the `VERCEL_PROJECT_ID` variable is set, and we leave that empty so the two never fight.

GitHub Actions are pinned to commit SHAs, and the containers run as a non root user. The Go image is distroless, so there is no shell inside it. One gotcha worth remembering: Cloud Run reserves `/healthz` and answers it with its own 404 page, so our health route is `/health`.

Rolling back is a traffic switch, no rebuild needed:

```bash
gcloud run revisions list --service sirujuk-backend --region us-east4
gcloud run services update-traffic sirujuk-backend --region us-east4 --to-revisions <previous revision>=100
```

One thing to know about hand deploys: the next pipeline run replaces whatever revision is live, so a fix applied by hand disappears on the following merge.

## Test results

### Automated checks on every push

These are the numbers from the pipeline run that shipped the latest release.

| Job | What it runs | Result | Time |
|:--|:--|:--|:--|
| backend | go vet, go test with the race detector, govulncheck | 65 tests pass across 8 packages. Our code reaches 0 known vulnerabilities | 2.2 min |
| ml | installs the pinned requirements, trains the model, runs the smoke script, runs pip-audit | Smoke script passes. No known vulnerabilities in the requirements | 1.0 min |
| frontend | npm ci, jest, next build, npm audit | 36 tests pass in 6 suites. The build succeeds. 0 vulnerabilities | 0.7 min |
| deploy-gcp | builds and pushes two images, replaces both Cloud Run services, checks `/health` | Succeeded | 3.0 min |

The whole run took 5.3 minutes. A pull request is faster because it skips the deploy.

The ML side is covered by one smoke script, not a unit test suite. It trains the model and asserts on the output, for example that a suspicious referral scores higher than one with no history. If you want more safety there, that is the first place to add tests.

Two scanner notes. `govulncheck` also lists one advisory in a module we require but never call, the OpenPGP package inside `golang.org/x/crypto`. It does not affect us. And the secret scan, which looks through each diff for our live token, account passwords and common key patterns, is something we run by hand before merging. It is not part of CI yet.

### A canary before the last release

Before merging the latest release we deployed the new backend and ML images to Cloud Run as tagged revisions that receive no traffic, and tested those instead of guessing.

| Check | Result |
|:--|:--|
| New backend starts with production settings, Firestore and the new secret | Started |
| `/ready` | Firestore ok, KNS list ok, Redis down (expected, it is a placeholder) |
| The four real accounts log in against Firestore | 4 of 4 |
| Wrong password | 401 |
| A user claiming a role that is not theirs | 403 |
| An actor that does not exist | 403 |
| New ML image answers `/v1/predict` | 200 |
| New backend and new ML scoring together | Correct, run side by side on a laptop |

One thing we could not test that way: the canary backend calling the canary ML on Cloud Run. A tagged URL is not accepted as the audience of the service to service token, so those calls get a 401. In production the backend uses the main ML address, which is the audience the token is made for, and the live checks below confirm it works.

### Live checks after the release

Run against https://sirujuk.vercel.app and the production services.

| Check | Expected | Observed |
|:--|:--|:--|
| Log in as each of the four roles | 200 | 200 for all four |
| Wrong password versus an unknown email | Same answer for both | Same 401 body |
| Score a referral as a verifikator | A decision from model v2 | Scored by `composite-lr-synthetic-v2`, 5 of 5 |
| Score without a session | 401 | 401 |
| Score as a dokter | 403 | 403 |
| Passwordless demo login | Not available | 404 |
| Backend call without the bearer token | 401 | 401 |
| ML service called directly without a token | 403 | 403 |
| Logo, photo and illustrations while logged out | 200 | 200 |
| Open `/dashboard` while logged out | Redirect to login | 307 to `/login` |
| Response headers on the site | CSP, HSTS and friends | CSP with a fresh nonce per request, HSTS for a year, X-Frame-Options DENY, nosniff, Referrer-Policy no-referrer |

### Speed

These were measured from a laptop in Indonesia, so a good part of every number is the trip across the ocean to us-east4.

| What | Result |
|:--|:--|
| Login | About 0.45 s |
| Score through the site with the ML service warm | 0.5 to 2.0 s round trip |
| Backend time alone for a score, ML warm | 69 to 137 ms. Measured before referrals moved to Firestore, so expect a little more now |
| First score after the ML service has been idle | Comes back as ACCEPTED_ASYNC, without a score |
| Cloud Build time | Backend about 1 min 10 s. ML about 2 min 50 s because it trains the model |

That ACCEPTED_ASYNC answer is the one people ask about. The backend only waits 300 ms for the ML service, and a service that scaled to zero needs a few seconds to wake up. By design the referral is never blocked, it just goes through without a score that time. Setting `ML_MIN_INSTANCES=1` keeps one instance warm and removes the effect, at a cost every month.

## Problems the checks caught

This is the honest list. Each one was found by a gate or a test, which is the reason to have them.

1. The pinned FastAPI release pulled in starlette 0.41.3, which `pip-audit` reports with 14 known vulnerabilities. We moved to FastAPI 0.143.0, which uses starlette 1.7.0, and confirmed scoring still works on the live service.
2. The GitHub runner shipped Go 1.26.8, where `govulncheck` flagged a standard library issue fixed in 1.26.9. The workflow now asks for the latest patch release.
3. Logged out visitors saw broken images. The login gate in `frontend/proxy.ts` also covered the root logo file, so the browser got a redirect instead of a picture. The matcher now skips image files and a unit test holds both sides.
4. The canary failed to start once, and the reason was our own command: `gcloud run deploy --set-secrets` replaces the whole secret list, so the API token disappeared. The backend's startup check said exactly that. Use `--update-secrets` to add one.
5. The five referrals we sent while testing the live site were stored in Firestore for good and showed up in the list. We deleted them. Use a separate environment for test data.
6. A pipeline deploy overwrote a revision we had deployed by hand. See the rollback section above.

## Day to day

Logs: `gcloud run services logs read sirujuk-backend --region us-east4 --project <project id>`. Replace the service name with `sirujuk-ml` for the ML side.

Rotating the API token takes three steps. Add a new version of the `sirujuk-api-token` secret, update `API_TOKEN` in Vercel to the same value, then run the pipeline again so the backend picks up the latest version.

Accounts are managed with `go run ./cmd/useradd` from `backend-go`, and the full set of flags is in [install.md](install.md). A disabled account loses its login and any live session within about 30 seconds.

Cost stays low because everything scales to zero and the caps above limit the damage from abuse. The Cloud Run, Firestore and Vercel free tiers are meant to cover this size of traffic, but check the Google pricing calculator for your region before you rely on it.

## Known gaps

These are the things a reviewer should know before trusting this with real data.

1. Redis is a placeholder URL. The backend runs, but the shared login limiter, replay protection, doctor feature cache and the async queue are off. A referral that goes async is not stored.
2. Four demo accounts with a public password exist in the production Firestore. That was a deliberate choice for demos. Disable them with `useradd -disable` before real referral data arrives.
3. The frontend and the backend share one bearer token. The signed in user is passed along in `X-Actor` headers and trusted because of that token. Per user credentials are the next step.
4. Passwords are hashed with scrypt at Node's default cost, which is below current OWASP guidance. Fine for a demo, raise it before real data. The hash format would need a version marker to do that cleanly.
5. Referrals are archived rather than deleted, so removing bad data is a manual Firestore job.
6. A release replaces the ML model and the backend a few minutes apart. Scores in that window use mismatched thresholds.
7. The existing dokter account has no doctor id, so it sees no referrals until one is assigned.
8. The data sits in us-east4, in the United States. If Indonesian residency rules apply to real patient data, plan a move to asia-southeast2. Firestore cannot change location, so that means a new database.
9. Dependabot is off because it kept opening branches. Its config file is gone from `main` and its security update pull requests are disabled in the repository settings, while vulnerability alerts still notify you. That means nothing scans dependencies between pushes now. A weekly audit workflow that only reports, and never opens branches or deploys, would close that gap.
