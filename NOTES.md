
# LeadFlow: design notes

Decisions, trade-offs and known limitations. See README.md for setup and test logins, and PROMPTS.md for every AI prompt.

## 1. Scope

**Built (core):** multi-tenant isolation, authentication and roles, lead intake from a real tool (Tally webhook), live pipeline board, duplicate-person detection, lead-to-client conversion, client portal with uploads, background document checks with live status, dashboard.

**Deliberately not built:** email templates, email triggers on stages, task triggers on columns (requirements 8 to 10); platform admin UI; staff invitations. Reason: the brief rewards a smaller product that works well, so I put the time into isolation, real-time behavior, the document pipeline and resilience. The three automation features would plug into `moveLeadStage` and reuse the same BullMQ queue.

## 2. Architecture

React (Vite, Tailwind, React Router) on Vercel talks over REST and Socket.IO to a single Express process on Render. That process runs the API, the Socket.IO server and the BullMQ worker. Data lives in MongoDB Atlas (documents, users, leads, and uploaded files in GridFS). Redis Cloud holds BullMQ jobs and the dashboard cache.

Request path: route -> middleware (authenticate, authorize) -> controller (validates input) -> service (business rules, live events) -> model.

Why one process: the worker must reach the Socket.IO server to push live status, and the free tier offers one service. At scale: split the worker out and add the Socket.IO Redis adapter.

## 3. Roles

- Platform admin: can log in; no UI yet (brokerages are created by the seed script).
- Brokerage admin and advisor: currently identical (board, convert, documents, dashboard). Admin-only features (users, templates, triggers) were the cut features.
- Client: only their own case and documents.

## 4. Decisions by area

### Authentication
- JWT with id, role and brokerageId. The user is reloaded from the database on every request, so deactivation is immediate (cost: one read per request).
- Same error for unknown email and wrong password. Login rate-limited. Passwords hashed with bcrypt and never selected by default.
- Token kept in localStorage for simplicity (XSS trade-off; httpOnly cookies would be safer).

### Tenant isolation
- brokerageId always comes from the verified token, never from the request.
- Every query is scoped by brokerageId. A Mongoose plugin (`utils/tenantPlugin.js`) rejects any query without it, so a forgotten filter fails loudly.
- Another brokerage's id returns 404, not 403, so its existence is not revealed.
- Aggregations bypass the plugin, so each starts with an explicit `$match` and an ObjectId cast.
- Socket rooms are assigned by the server from the verified token; there is no client-controlled join.
- One shared database (simple, cheap) means shared capacity.

### Lead intake (Tally webhook)
- HMAC-SHA256 signature checked on the raw request body with a per-brokerage secret and a timing-safe compare. Unknown brokerage and bad signature both return 401.
- Idempotency: unique index on (brokerage, source, externalId). A repeated delivery returns 200 instead of creating a duplicate or triggering endless retries. A database index is used instead of check-then-insert because simultaneous requests can both pass a check.
- Rate limit is keyed per brokerage, so one brokerage flooding does not consume another's allowance.
- Limitation: only Tally; fields are found by label keywords.

### Duplicate detection
- Same brokerage, same email or normalized phone. The new lead is flagged (`duplicateOf`), not rejected, because a repeat enquiry is a buying signal.
- Limitation: exact matching only, leads only (clients are not checked), and two simultaneous new leads could miss each other.

### Pipeline and concurrency
- Optimistic concurrency: each lead has a version; a move is one atomic update filtered on the expected version. Exactly one of two simultaneous moves wins, and the other gets 409 with the current lead so the UI corrects itself.
- Chosen over locks: no waiting, no stuck locks, works across servers.
- Events are broadcast only after the database write succeeds. Events include who moved the lead.
- [verify] Tested with a script that fires two simultaneous moves with the same version (`npm run test:race`) and with a stale screen in the browser.

### Real time (Socket.IO)
- Database is the source of truth; sockets are notifications. Missed events are never replayed, so every screen refetches after a reconnect, and stale events are ignored using version or updatedAt.
- One shared connection for the whole frontend.
- Limitations: single instance; token verified at connect time only; no touch-screen drag and drop.

### Lead to client
- A client is a User (role client) linked from the lead through `clientUserId`; the lead is the case.
- Conversion runs in a transaction and claims the lead atomically (filter `clientUserId: null`), so two advisors cannot both convert it.
- A temporary password is shown once and stored only as a hash. Limitation: a real product would send an email invite link.
- Clients see only name, stage and their own documents.

### Documents and storage
- Files stored in MongoDB GridFS behind a two-function storage module (`saveFile`, `openDownload`); S3 or R2 would be a one-file swap. Chosen for privacy (no public URLs), no extra account and persistence.
- Downloads always pass a permission check (brokerage for staff, brokerage and owner for clients) and are served as attachments with nosniff.
- Limits: 5 MB, PDF/JPG/PNG, 50 documents per case, upload rate limit per user.
- Limitations: file type trusted from the browser; no virus scanning; uses database space.

### Background checks (BullMQ and Redis)
- Upload saves the file and a `pending` record and returns immediately; a job holding only ids is queued (job id = document id, so duplicates are ignored).
- Worker (concurrency 3): marks `checking`, waits 5 to 15 seconds, fails about 30% of the time. BullMQ retries up to 3 times with exponential backoff; between retries the document shows as waiting with its reason, and after the last attempt it becomes `failed`.
- Jobs are idempotent (at-least-once delivery), and a crashed worker's job is re-delivered by BullMQ.
- Redis is not the source of truth: a recovery sweep every minute re-queues documents stuck in `pending`, and an upload succeeds even if Redis is down.
- [verify] Tested: failure and retry path, killing the server mid-check, and a wrong Redis URL during an upload.
- Limitations: documents stuck in `checking` with no job are not swept (fix: also sweep old `checking` documents); one shared queue is not perfectly fair between brokerages; the free server sleeps, so checks run only while it is awake; Redis free tier uses `volatile-lru` instead of the recommended `noeviction`.

### Dashboard
- One `$facet` aggregation per brokerage, cached in Redis under a per-brokerage version number. Any change bumps the version (so old copies are unreachable) and pushes a `dashboard:changed` event; open dashboards refetch, debounced.
- Versioning instead of deleting the cache avoids a race where a slow computation writes old data after invalidation.
- Fail-open: if Redis is slow or down, numbers are computed from MongoDB. A 60-second expiry is only a safety net for a lost version bump.

### Frontend
- Organized by feature, with contexts for auth, the shared socket and toasts. React Router with role-guarded routes; the lead panel is a child route so Back, refresh and deep links work. Role redirects are UX only; the server enforces authorization.
- Tailwind v4 with a small set of shared components; one accent color per pipeline stage.
- Optimistic board updates with server correction on a 409.

### Deployment
- Vercel (frontend), Render (API and worker), Atlas, Redis Cloud. Production uses its own JWT secret. CORS is restricted by an allow-list (`CLIENT_URL`) for both REST and Socket.IO. Trust proxy is enabled so rate limits see real client addresses.
- Dev and production share one Atlas database for this assignment.
- Limitation: free instance sleeps after 15 minutes idle (slow first request).

## 5. Answers to the brief's questions

| Question | Answer |
|---|---|
| Same lead twice, or a burst | Unique index, 200 on repeats, per-brokerage rate limit |
| Two advisors move one lead | Versioned atomic update; loser gets 409 and the board corrects itself |
| Worker crashes mid-job | BullMQ re-delivers; idempotent job; recovery sweep |
| Email provider down | Not built; would be a queued job with retries and backoff |
| One brokerage floods | Per-brokerage and per-user limits, capped concurrency (shared queue not perfectly fair) |
| Guessed id of another brokerage's lead | Scoped queries plus the tenant plugin return 404 |
| Advisor offline for two minutes | Socket reconnects and the client refetches from the database |

## 6. Known gaps and what I would do next

1. Email templates, email triggers and task triggers (plug into `moveLeadStage`, reuse the queue).
2. Staff invitations by email; client invite links instead of temporary passwords; a platform admin UI.
3. Automated tests (unit and integration), and more checking beyond manual scripts.
4. Split the worker from the API and add the Socket.IO Redis adapter; per-brokerage queues; sweep stuck `checking` documents.
5. Pagination, search and filters on leads; touch-friendly drag and drop; accessibility pass.
6. Magic-byte file validation and virus scanning; httpOnly cookie sessions.
