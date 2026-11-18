# Portfolio platform — admin dashboard, requests, live chat and AI assistant

The private dashboard lives at `/admin` and is backed by the same Cloudflare Worker that
serves the public site. Data lives in D1 (SQL), media and uploads in R2, and every admin
route re-validates a server-side session. The vault entrance is at `/security`.

## Features and where they live

| Feature | Public surface | Admin surface | Storage |
| --- | --- | --- | --- |
| Hire Me / Project Inquiry | `ProjectInquiryDialog` → `POST /api/requests` | Requests Received, Client Details | `client_requests`, `request_files`, R2 `requests/…` |
| Direct chat | "Talk Directly With GurSimar" → `/api/chat/*` | Live Conversations, availability switch | `conversations`, `messages` |
| AI assistant | floating assistant → `/api/ai/chat` | AI Assistant Settings | `ai_threads`, `ai_messages`, R2 `ai/…` |
| Portfolio uploads | public gallery | Portfolio Management | `projects`, `upload_fingerprints`, R2 |
| Maintenance | full-screen page from `/api/site/status` | Website Maintenance Mode | `settings` |
| Security | vault at `/security` | Security Settings | `sessions`, `settings` |

## Prerequisites

1. Node 20+, dependencies installed with `npm install` (or `bun install`).
2. A Cloudflare account with Workers, D1 and R2 enabled (`wrangler login`).
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
| `AI_API_KEY` | API key for the OpenAI-compatible provider. |

Plain Worker variables / bindings:

| Name | Default | Notes |
| --- | --- | --- |
| `AI_API_URL` | `https://api.openai.com/v1/chat/completions` | Any OpenAI-compatible endpoint. |
| `AI_MODEL` | `gpt-4o-mini` | Overridable per deployment from AI Assistant Settings. |
| `AI_PROVIDER` | `openai-compatible` | Label only; shown in the dashboard. |
| `DB` | `wrangler.toml` D1 binding | All relational data. |
| `FILES` | `wrangler.toml` R2 binding | Portfolio media, request attachments, AI uploads. |

`.dev.vars.example` documents the local equivalents. `.dev.vars` is git-ignored.

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars        # then fill in the values
node scripts/hash-admin-password.mjs "a-long-unique-password"
npx wrangler d1 execute portfolio-db --local --file worker/schema.sql

npm run worker:dev                    # Worker + built site on http://127.0.0.1:8787
npm run dev                           # Vite on :5173, proxies /api and /media
```

## Production deployment

```bash
npx wrangler d1 create portfolio-db          # copy database_id into wrangler.toml
npx wrangler r2 bucket create portfolio-media
npx wrangler d1 execute portfolio-db --remote --file worker/schema.sql

npx wrangler secret put ADMIN_EMAIL
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put AI_API_KEY           # optional until the chatbot is enabled

npm run build
npx wrangler deploy
```

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
- Deleting a request removes its rows and its R2 objects.

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
