# Frontend

This is the web app that verifiers, TKMKB members, health office staff and FKTP doctors use to review referrals that the scoring service flagged. It is a Next.js app written in TypeScript. It does not calculate any score itself. It shows what the backend and the ML service decided, explains why, and lets people record their own decision.

The page you are reading covers how to install and run the app, how to set up the environment, and what was tested. Last checked on 10 October 2026.

## What it is built with

Next.js 16 with the App Router, React 19, TypeScript, Tailwind CSS 3, React Query for server data, Zustand for a few small filters, GSAP and Lenis for the landing page animation, and Jest with Testing Library for tests. The font is Plus Jakarta Sans, loaded through `next/font`, so no request goes to Google at runtime.

## Requirements

You need Node.js 22 or newer and npm. CI runs on Node 22. I also ran everything below on Node 26 and it behaved the same. You do not need Go or Python to work on the UI, but you do need a reachable backend if you want real data. The deployed backend is described in the section on environment variables.

## Install

Clone the repository, move into the frontend folder and install the exact versions from the lockfile.

```bash
git clone https://github.com/adyuta447/sirujuk.git
cd sirujuk/frontend
npm ci
```

Use `npm ci` rather than `npm install`. It keeps `package-lock.json` untouched and fails loudly if the lockfile and `package.json` disagree.

Next, create your local environment file as described in the next section, then start the dev server.

```bash
npm run dev
```

Open http://localhost:3000. The landing page is public. Everything else asks you to sign in.

Other commands you will use:

```bash
npm test          # run the unit tests once
npm run build     # production build, also type checks
npm start         # serve the production build
npx tsc --noEmit  # type check only
```

## Environment variables

Copy the example file and fill it in.

```bash
cp .env.example .env.local
```

`.env.local` is ignored by git. Never commit real values.

```bash
# Where the Go backend lives. Read by the Next.js server only.
BACKEND_URL=https://sirujuk-backend-148917316834.us-east4.run.app

# Shared service token the backend expects as a Bearer token.
# Server side only. Do not add a NEXT_PUBLIC_ prefix.
API_TOKEN=

# Signs the session cookie. Use at least 32 random characters.
AUTH_SECRET=

# Optional. Shows one click sign in buttons on /login. Leave it empty by default.
DEMO_MODE=
```

A few notes on each one.

`BACKEND_URL` is the address of the Go service. For local development against a backend running on your machine, use `http://localhost:8080`. The browser never sees this value, because every API call goes through the Next.js server first (the routes under `app/api`).

`API_TOKEN` must match the token configured on the backend. Without it the backend answers 401 to every request. The proxy adds it on the server, so it is not exposed to the browser.

`AUTH_SECRET` is used to sign the session cookie. Generate one with:

```bash
openssl rand -hex 32
```

If it is missing or shorter than 32 characters, sign in returns an error and every protected page redirects to the login page. That is on purpose, so a misconfigured deploy fails closed instead of open.

`DEMO_MODE=true` turns on the one click demo buttons. It is ignored automatically when `VERCEL_ENV` or `APP_ENV` is `production`, so it cannot be switched on in a production deploy by accident. Use it on a preview deployment or on your own machine. The backend must also have `DEMO_ACCOUNTS=true` and must not run with `APP_ENV=production`.

User accounts are not stored in the frontend. They live in the backend, in Firestore, and sign in is checked by the backend. To add an account, run this from the repository root:

```bash
cd backend-go
SANDI='at-least-12-characters' go run ./cmd/useradd -project <project-id> -email a@b.id -nama "Full Name" -role verifikator
```

The valid roles are `verifikator`, `tkmkb`, `dinkes` and `dokter`. For the exact flags, check `backend-go/cmd/useradd`.

## Signing in locally

Start the backend and ML service first if you are not using the deployed ones. The root `docker-compose.yml` does that. With `DEMO_ACCOUNTS=true` on the backend, the accounts listed in `docs/demo.md` exist, and with `DEMO_MODE=true` in `.env.local` you get one click buttons on the login page. Chrome accepts secure cookies on localhost and Safari does not, so test sign in in Chrome.

## Roles and what each can see

A verifier works the queue, opens referral details, and records audit decisions on yellow cases. A TKMKB member can do the same and is the only role that can finalize a red case or archive a referral. Health office staff only see regional summaries and never see patient rows. A doctor only sees referrals attached to their own doctor id and can answer clarification requests.

These limits are enforced on the server. `proxy.ts` redirects people away from pages their role cannot open, and the API routes under `app/api/v1` check the session and role again before they talk to the backend. Hiding a menu item in the UI is only a convenience, never the protection.

## Test results

All of this was run on 10 October 2026, from the `frontend` folder, on the current working tree.

Type check. `npx tsc --noEmit` finished with no errors.

Unit tests. `npm test` ran 6 suites and 36 tests. All passed in about 1.1 seconds.

The suites cover these areas:

1. `RiskBadge`: the risk label and score are exposed to assistive technology, not only color.
2. `referral`: the risk category comes only from the backend decision and never from a score threshold, age, participant type and region are not invented, a case is marked finished only when the backend says it is final, the claim status is passed through, and the indicator numbers are read exactly from the ML response, including the warning when facility distance is unknown.
3. `auth`: session tokens round trip, a tampered payload that tries to change the role is rejected, wrong secrets and expired or malformed tokens are rejected, doctors are kept out of officer pages, and only officers can call scoring. The sign in client treats 401 as wrong credentials, throws on a backend failure instead of claiming the password is wrong, and refuses a response that contains an unknown role.
4. `csp`: the Content Security Policy uses a fresh nonce on each request, has no `unsafe-inline` or `unsafe-eval` for scripts, blocks objects and framing, and leaves static images outside the login gate while keeping pages inside it.
5. `hardening`: demo mode is off by default and in any production deployment, a verifier is blocked on red referrals while yellow ones pass, TKMKB passes without an extra backend lookup, the check fails closed when a referral cannot be read, the signed in user is forwarded as the actor, and oversized request bodies are rejected before they are read.
6. `security`: a source scan that fails if the code ever contains `eval`, `new Function`, `child_process`, `dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `document.write`, `insertAdjacentHTML`, string timers, or a secret placed behind a `NEXT_PUBLIC_` name.

Production build. `npm run build` compiled successfully and produced 28 routes, all server rendered on demand because the nonce based CSP needs a fresh render per request. The routes include the landing page, login, dashboard, queue, referral detail, audit, clarification, doctor profiles, regional view, analytics, the score form, and the API routes for auth, referrals, audits, scoring and stats.

Dependencies. `npm audit --omit=dev` reports 0 vulnerabilities. GitHub Dependabot also reports an open alert on `braces` 3.0.3. It comes in only through development tools (Jest, msw and Tailwind at build time), it is not in the production bundle, and no patched version exists yet, so there is nothing to upgrade right now.

Checked by hand against a production build and a fake backend. Pages redirect to the login page when you are signed out. A doctor who opens a verifier page is sent to the clarification page. The score and audit endpoints answer 401 without a session and 403 for the wrong role or a request from another origin. The reviewer name on an audit comes from the session, not from the request body. After ten wrong passwords for the same email within 15 minutes the login route answers 429. The demo endpoint answers 404 when demo mode is off.

## What is not covered

There are no browser level or end to end tests, so layouts on real phones and large monitors have not been verified automatically, and I have only looked at the responsive behavior through code and CSS, not through a device lab. There is no visual regression testing and no coverage report. The newest backend contract (the final flag, claim status, role based redaction and the indicators block) is covered by unit tests with fixtures. It has not yet been run end to end against a deployment that includes those changes. Please run a full pass as each role once the backend is deployed.

## Security notes worth knowing

The Content Security Policy is set in `proxy.ts` with a per request nonce. The session cookie is `HttpOnly`, `SameSite=Lax`, and uses the `__Host-` prefix with `Secure` in production. The browser only talks to same origin routes. Requests that change data check that the `Origin` header matches the host, which protects against cross site requests. Error messages from the backend are shown to the user only for 4xx responses. Server errors become a generic message so no internal detail leaks.

The score is a priority signal for human review. It is not proof of fraud, and the interface says so on the pages that show it. Model quality so far was measured on synthetic data, and that is also stated in the UI.

## Deploying

The production site runs on Vercel at https://sirujuk.vercel.app. Set `BACKEND_URL`, `API_TOKEN` and `AUTH_SECRET` in the Vercel project settings for the Production environment. Do not set `DEMO_MODE` there. If you do, it is ignored anyway. The backend and ML service deploy to Cloud Run through the GitHub Actions workflow in `.github/workflows/deploy.yml` when changes reach `main`.

If sign in fails after a deploy, check these in order: that `AUTH_SECRET` is set and long enough, that `API_TOKEN` matches the backend, that the account really exists in the backend Firestore, and whether the email is locked for 15 minutes after ten failed attempts.

## Project layout

```
frontend/
  app/            pages and API routes (App Router)
  components/     atoms, molecules and organisms
  hooks/          React Query and session hooks
  services/       typed clients that call /api/v1
  lib/            formatters, role rules, auth helpers
  types/          shared TypeScript types
  public/         images, illustrations, logo
  tests/unit/     unit tests
  proxy.ts        CSP, login gate and role checks
```

## Known limits

Some data is still synthetic. Pages that show seed data carry a banner that says so. Age and participant type are not shown, because the backend does not provide them yet. The score form is a manual entry point for testing and is not connected to P-Care or V-Claim, which the proposal describes as the real source of referrals. Photos on the landing page and the login page come from Unsplash, and their sources are listed in `public/images/SOURCES.md`. The illustrations are placeholders that can be swapped with files from unDraw, as described in `public/illustrations/SOURCES.md`.
