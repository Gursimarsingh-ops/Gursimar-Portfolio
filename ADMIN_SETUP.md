# Portfolio platform — admin dashboard, requests, live chat and AI assistant

The private dashboard lives at `/admin` and is backed by the same backend that serves
the public site (Cloudflare Pages Functions in production, the bound Worker locally).
Data lives in D1 (SQL), media and uploads in a private Backblaze B2 bucket (S3-compatible
API, signed server-side), and every admin route re-validates a server-side session. The
vault entrance is at `/security`. Cloudflare R2 is **not** used and is not required to
deploy.

## Features and where they live

| Feature | Public surface | Admin surface | Storage |
| --- | --- | --- | --- |
| Hire Me / Project Inquiry | `ProjectInquiryDialog` → `POST /api/requests` | Requests Received, Client Details | `client_requests`, `request_files`, B2 `requests/…` |
| Direct chat | "Talk Directly With GurSimar" → `/api/chat/*` | Live Conversations, availability switch | `conversations`, `messages` |
| AI assistant | floating assistant → `/api/ai/chat` | AI Assistant Settings | `ai_threads`, `ai_messages`, B2 `ai/…` |
| Portfolio uploads | public gallery | Portfolio Management | `projects`, `upload_fingerprints`, B2 |
| Maintenance | full-screen page from `/api/site/status` | Website Maintenance Mode | `settings` |
| Security | vault at `/security` | Security Settings | `sessions`, `settings` |

## Prerequisites

1. Node 20+, dependencies installed with `npm install` (or `bun install`).
2. A Cloudflare account with Workers and D1 enabled (`wrangler login`) — R2 does not
   need to be activated. A Backblaze B2 bucket with an application key is required for
   media uploads.
3. An OpenAI-compatible chat-completions API key if the AI assistant should answer.
   Without a key the assistant shows a clear "not configured" message and never fakes
   answers.

## Database schema

Apply the schema in both environments. It is idempotent (`CREATE TABLE IF NOT EXISTS`).

```bash
# local
npx wrangler d1 execute portfolio-db --local --file worker/schema.sql

# production
npx wrangler d1 execute portfolio-db --remote --file worker/schema.sql
```

Tables: `projects`, `upload_fingerprints`, `sessions`, `settings`, `client_requests`,
`request_files`, `conversations`, `messages`, `ai_threads`, `ai_messages`.

## Environment variables and secrets

Worker secrets (never committed, never sent to the browser):

| Name | Purpose |
| --- | --- |
| `ADMIN_EMAIL` | Administrator sign-in email. Set to `gursimarsingh9390@gmail.com`. |
| `ADMIN_PASSWORD_HASH` | `pbkdf2:100000:<salt>:<hash>` from `scripts/hash-admin-password.mjs`. |
| `AI_API_KEY` | NVIDIA NIM API key (server-side only; dashboard storage is preferred). |
| `B2_APPLICATION_KEY_ID` | Backblaze application key id (server-side only). |
| `B2_APPLICATION_KEY` | Backblaze application key (server-side only). |

Plain Worker variables / bindings:

| Name | Default | Notes |
| --- | --- | --- |
| `AI_API_URL` | `https://integrate.api.nvidia.com/v1/chat/completions` | Any OpenAI-compatible endpoint. |
| `AI_MODEL` | `minimax-m3.1-flash` | Overridable per deployment from AI configuration. |
| `AI_PROVIDER` | `nvidia-nim` | Label only; shown in the dashboard. |
| `DB` | `wrangler.toml` D1 binding | All relational data. |
| `B2_BUCKET_NAME` | `gursimar-portfolio` | Private B2 bucket (S3-compatible API). |
| `B2_REGION` | `us-east-005` | B2 region used for SigV4 signing. |
| `B2_ENDPOINT` | `https://s3.us-east-005.backblazeb2.com` | B2 S3 endpoint. |

`.dev.vars.example` documents the local equivalents. `.dev.vars` is git-ignored.

## Shared backend (localhost and production are the same system)

There is exactly one database and one media bucket. `wrangler.worker.toml` marks the D1
binding `remote = true` and points at the same Backblaze B2 bucket, so `npm run dev:api`
runs the Worker locally but reads and writes the **deployed** D1 database and B2 bucket.
Anything you upload, edit, delete or toggle on localhost lands in production, and the
live site reads the same rows and objects.

```
browser :5173 ─┐
               ├─ /api, /media ─► Worker (wrangler dev) ─► D1 portfolio-db (remote)
public domain ─┘                          └─► Backblaze B2 gursimar-portfolio (private)
```

`wrangler dev` does **not** copy production secrets, so the administrator credentials
come from `.dev.vars` locally and from Worker secrets in production. Both must hold the
**same** `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH`, otherwise localhost sign-in succeeds
while the deployed sign-in fails.

### Local development

```bash
npm install
cp .dev.vars.example .dev.vars        # fill in ADMIN_EMAIL + hash
node scripts/hash-admin-password.mjs "a-long-unique-password"   # put the output in .dev.vars
npx wrangler login                    # required for remote bindings
npm run db:remote                     # schema on the shared database (idempotent)
npm run dev:api                       # Worker :8787 against shared D1 + R2
npm run dev                           # Vite :5173, proxies /api and /media
```

Offline work without a Cloudflare account:

```bash
npm run dev:api:local                 # emulated .wrangler/state, never touches production
npm run db:local
```

Alternative: point the Vite dev server at the deployed Worker instead of running one
locally. The browser then talks to the exact production backend instance.

```bash
# .env.local
API_PROXY_TARGET=https://your-worker.workers.dev

# Worker secret, so the dashboard's origin check accepts the dev origin
npx wrangler secret put DEV_ORIGIN    # value: http://localhost:5173
npm run dev
```

### Production deployment (existing Pages project, unchanged URL)

Production is the Cloudflare Pages project `gursimar-portfolio` at
`https://gursimar-portfolio.pages.dev/`. It builds from `main` with:

| Setting | Value |
| --- | --- |
| Repository | `github.com/Gursimarsingh-ops/Gursimar-Portfolio` |
| Production branch | `main` |
| Framework preset | Vite (or None) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 20 or 22 |

A static-only Pages build serves the SPA but has **no `/api`** — that is exactly the
"uploads work locally, nothing changes live / login fails in production" symptom. The
backend therefore ships *with* the Pages project as Pages Functions:

```
functions/api/[[path]].ts    -> /api/*    (projects, admin, requests, chat, AI, health)
functions/media/[[path]].ts  -> /media/*  (Backblaze B2 images and videos)
public/_routes.json          -> only those prefixes run as Functions
```

Both adapters call the same `handleBackendRequest()` in `worker/index.ts`, so the
public site, `/admin` and `/security` on the live domain use the identical code and the
identical D1 + B2 store as localhost. `wrangler.toml` is the Pages config
(`pages_build_output_dir = "./dist"`); `wrangler.worker.toml` keeps the standalone
Worker target used by `npm run dev:api`.

One-time setup:

```bash
npx wrangler login
npx wrangler d1 create portfolio-db          # copy database_id into wrangler.toml
```

Then in the Pages dashboard, for the **Production** environment:

1. Settings → Functions → Bindings: `DB` = D1 `portfolio-db` only. Do **not** add an
   R2 binding: a missing R2 bucket fails the entire Function upload.
2. Settings → Variables and Secrets: plain variables `B2_BUCKET_NAME`, `B2_REGION`,
   `B2_ENDPOINT`; secrets `B2_APPLICATION_KEY_ID`, `B2_APPLICATION_KEY`,
   `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, optionally `AI_API_KEY`. These are the only
   place the production password hash, B2 keys and AI key exist — never the repo.
3. Settings → Builds & deployments: build command `npm run build`, output `dist`,
   production branch `main`.

Then:

```bash
npm run db:remote        # schema on the shared database (idempotent)
npm run migrate:cloudflare   # copy existing local projects + media up
git push origin main     # Pages builds, runs Functions, deploys
```

`npm run deploy` (manual, same project) runs `scripts/check-cloudflare-config.mjs`
first and refuses while the placeholder `database_id` is in `wrangler.toml`:

```bash
npm run deploy           # wrangler pages deploy  (reads wrangler.toml)
npm run deploy:worker    # alternative: standalone Worker + assets
```

### Why changes were not appearing

Cloudflare Pages deploys the **pushed commit**, not the working tree. Any change that
was never committed and pushed to `main` could not reach the live site, and even a
pushed SPA build could not write data because the static project had no `/api`. Both
halves are fixed here: the backend now deploys with the site, and every change must
reach `main` to be live.

### Migrating existing local content

```bash
npm run migrate:cloudflare -- --dry-run   # list rows and objects that would move
npm run migrate:cloudflare                # schema + INSERT OR IGNORE database rows
```

Production rows are never overwritten; only missing records are added. Objects keep
their original keys, so existing project links stay valid.

### Verifying the shared setup

```bash
npm run deploy:check                       # config/secret sanity check
npx wrangler d1 execute portfolio-db --remote --command "SELECT COUNT(*) FROM projects"
curl -s https://<your-domain>/api/projects | head -c 400
```

The project count must match between localhost (`/api/projects`) and the deployed
domain. If they differ, the two environments are still using different databases.

## Security model

- `POST /api/admin/login` verifies email + password against Worker secrets using PBKDF2
  (100,000 iterations — the Workers WebCrypto cap — with constant-time comparison).
  The plaintext password exists only in
  the request; it is never stored in the bundle, in D1, or in the browser.
- A successful login creates a 256-bit random token. Only its SHA-256 hash is stored in
  `sessions`; the raw token lives in an `HttpOnly`, `SameSite=Strict`, `Secure` (HTTPS)
  cookie with a 7-day lifetime.
- Every `/api/admin/*` route re-validates the session server-side. Removing the React
  guard or calling the API directly still returns `401`.
- Mutating admin requests, inquiry submissions, chat messages and AI calls reject a
  foreign `Origin` (loopback-to-loopback allowed for local Vite proxying only).
- Login attempts are throttled per IP (8 failures / 15 minutes per Worker isolate).
- Request attachments are only served through `/api/admin/files/:id` behind a session.
  AI uploads are never publicly served.
- Uploads are validated by MIME allow-list, size limit and file-signature check.
- Security Settings can sign out other sessions or every session.

### Password rotation

```bash
node scripts/hash-admin-password.mjs "<new long password>"
npx wrangler secret put ADMIN_PASSWORD_HASH
npm run build && npx wrangler deploy
```

Then open Security Settings → "Revoke every session".

## Client requests

- The Hire Me form posts multipart to `POST /api/requests`; the Worker validates fields,
  stores up to 5 attachments (images, PDF, DOC/DOCX, TXT; 10–15 MB each, 25 MB total),
  and returns the generated request id.
- Every request appears in Requests Received with status, private notes, attachment
  download links and previous requests from the same email.
- Statuses: `new`, `reviewed`, `discussion`, `accepted`, `rejected`.
- Deleting a request removes its rows and its B2 objects.

## Live chat

- Visitors start a conversation with name + email. The Worker returns an opaque
  conversation id and a 256-bit token; only the token hash is stored. The browser keeps
  the pair in `localStorage` so the conversation can be resumed.
- The visitor panel polls `/api/chat/:id` every 4 seconds while open; the admin panel
  polls every 5 seconds. Messages are persisted immediately in D1, so delivery does not
  depend on either side being connected continuously.
- The public status ("GurSimar is Online/Offline") is the real `availability` row in
  `settings`, toggled from Live Conversations or the dashboard sidebar. There is no
  simulated presence.
- This is polling, not a WebSocket relay. For sub-second delivery, replace the polling
  with a Durable Object or an external realtime service; the storage model already
  supports it.

## AI assistant

- All provider calls happen in the Worker: `AI_API_URL` + `AI_API_KEY`. The browser never
  sees a key.
- Provider/model are configurable from AI Assistant Settings and via environment
  variables; switching to another OpenAI-compatible provider only needs a new
  `AI_API_URL`/`AI_API_KEY`.
- The system prompt holds the portfolio knowledge base (`worker/knowledge.ts`) and strict
  guardrails: no invented experience, prices or clients, no admin/private data, no
  prompt disclosure.
- Rate limits: 25 messages / 10 minutes per IP, 200 stored messages per thread, 4,000
  characters per message. Failures return a friendly fallback and are logged server-side.
- Uploads: max 5 files, 25 MB total. Images (JPG/PNG/WebP) are sent to the model for
  analysis when the model supports image input. Video, PDF and document attachments are
  validated, stored and listed by name but are not parsed by the assistant.

## Notes and limits

- Video uploads for the portfolio are limited to 90 MB per Workers request limits.
- The AI assistant is disabled from the dashboard without deleting its history.
- `.dev.vars` must never be committed; `.gitignore` already excludes it.
