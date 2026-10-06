# LeadFlow

A multi-tenant lead and document platform for mortgage brokerages. Leads arrive from external tools, advisors work them on a live pipeline board, converted clients upload documents, and documents are checked in the background with live status.

**Live app:** https://lead-flow-green.vercel.app 

> The API runs on a free Render instance that sleeps after 15 minutes of inactivity. The first request can take up to a minute. Open `/api/health` first to wake it.

## Test logins

| Role | Email | Password |
|---|---|---|
| Brokerage admin (Alpha) | admin@alpha.test | Password123! |
| Advisor (Alpha) | advisor@alpha.test | Password123! |
| Brokerage admin (Beta) | admin@beta.test | Password123! |
| Advisor (Beta) | advisor@beta.test | Password123! |
| Platform admin | platform@leadflow.test | Password123! |
| Client (Alpha) | client@mortrage.com |  fJGathhSQaEE |

# sent lead with tally form 
 Link - https://tally.so/r/b5bQpo

Alpha and Beta are two separate brokerages, so you can check that neither sees the other's data.

## What it does

- **Multi-tenancy:** one deployment, many brokerages. Every record carries a `brokerageId`, taken from the verified login token, never from the request.
- **Lead intake:** a signed webhook from a real external tool (Tally forms).
- **Live pipeline board:** New → Contacted → Qualified → Application → Won / Lost, updated live on every open screen over WebSockets.
- **Duplicate detection:** a new lead matching a known person (email or phone) in the same brokerage is flagged "Known contact".
- **Lead → client:** an advisor converts a lead into a client who can log in, see their case and upload documents.
- **Background document checks:** uploads return immediately; a queue worker runs a simulated slow, sometimes-failing check with retries, and statuses update live for the client and the advisor.
- **Dashboard:** pipeline numbers, cached and invalidated on every change.

## Architecture

```
React (Vercel) ── REST + Socket.IO ──► Express API + worker (Render)
                                         ├── MongoDB Atlas  (data, files in GridFS)
                                         └── Redis Cloud    (BullMQ jobs, dashboard cache)
Tally ── signed webhook ──► /api/webhooks/tally/:brokerage
```

- **Roles:** platform admin, brokerage admin, advisor, client. Staff routes require staff roles, and clients can only reach their own case and documents.
- **Stack:** MongoDB, Express, React (Vite, Tailwind, React Router), Node, Socket.IO, BullMQ, Redis.

## Decisions and the "what if" questions

| Question | How it's handled |
|---|---|
| Same lead sent twice, or a burst of leads | Unique index on (brokerage, source, external id), so a retry can't create a duplicate. Webhook rate limit per brokerage |
| Two advisors move the same lead at once | Versioned, atomic update. The loser gets a 409 and the board refreshes to the real state |
| Worker crashes mid-job | BullMQ re-delivers the job. Jobs are idempotent, and a recovery sweep re-queues documents stuck as pending |
| Email provider down at stage change | Not built (see below). The planned design is a queued job with retries |
| One brokerage floods the system | Per-brokerage webhook limits, per-user upload limits, capped worker concurrency. Not perfectly fair (shared queue) |
| Someone guesses another brokerage's lead id | Every query includes the brokerage from the token, so it returns 404. A Mongoose plugin rejects unscoped queries |
| Advisor's internet drops for two minutes | Socket.IO reconnects, and the client refetches from the database, because missed events are not replayed |

## Run locally

```bash
# server
cd server && cp .env.example .env   # fill in MONGO_URI, JWT_SECRET, REDIS_URL
npm install && npm run seed && npm run dev

# client
cd client && cp .env.example .env   # VITE_API_URL=http://localhost:5000
npm install && npm run dev
```

## Not built, and why

- **Email templates, email triggers and task triggers.** I put the time into isolation, real-time behavior, the document pipeline and resilience, and left the three automation features for a next phase. They would hook into the existing stage-change function.
- **Platform admin UI.** Brokerages are created by a seed script.
- **Client invitations by email.** The advisor receives a temporary password once and passes it on.

See [NOTES.md](./NOTES.md) for the full list of design decisions and limitations, and [PROMPTS.md](./PROMPTS.md) for every AI prompt used.
