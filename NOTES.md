Design decision: a duplicate is flagged, not rejected (duplicateOf points to the earlier lead). An advisor should see "this person already contacted us" instead of silently losing the new enquiry. Later we can also check clients.

2. webhookController : This is a Tally webhook controller that receives lead submissions. First it identifies the active brokerage and verifies Tally's HMAC signature using the brokerage-specific secret. Then it filters the event type, extracts and validates the lead information, normalizes the phone number, and checks whether the person already exists. It creates the lead while marking any existing person as a duplicate instead of rejecting it. Finally, a unique database constraint protects against duplicate webhook deliveries, and a duplicate-key error is acknowledged safely

3. idempotency via a unique index (race-safe), duplicates are flagged and not rejected, and the webhook rate limit is per brokerage.

4. Tenant isolation: brokerageId comes from the verified token, and a Mongoose plugin rejects unscoped queries. Limitation: aggregations aren't covered, so they must begin with $match.
Auth: JWT, with the user re-loaded each request so deactivation is instant. Trade-off: one DB read per request.
Webhooks: HMAC signature check on the raw body. Idempotency through a unique index on (brokerage, source, externalId).
Duplicate people are flagged (duplicateOf), not rejected. Matching uses email or normalized phone. Limitation: exact matching only, so no fuzzy name matching.
Webhook rate limit is per brokerage.
Platform admin is a seed script, not a UI.

5. stage moves use optimistic concurrency (a version field with an atomic conditional update). A conflicting move returns 409 plus the current lead so the UI can refresh. Chosen over locking because it needs no waiting and works with several servers. Another brokerage's lead id returns 404, not 403, so its existence isn't revealed.

6. Tally is the lead source (free signed webhooks). Each brokerage has its own endpoint and secret, verified with HMAC. Limitation: only Tally is supported. Tested with a local tunnel; on deployment the tunnel isn't needed.

7. Business decisions in c) and d):

We broadcast only after the database write succeeds. If we announced first and the save failed, every screen would show something that never happened.
movedBy is included because the brief complains that advisors "cannot see who is handling what". Now every screen can show "Ravi moved Anna to Contacted".
The mover's own screen gets the event too. That's fine, because applying the same update twice does nothing harmful, and it keeps all screens consistent with one rule.
No rawPayload in broadcasts, since it holds the form's raw data and nobody needs it on the board.

8. Live updates use Socket.IO. JWT is verified at connection, and rooms are assigned by the server (brokerage:<id>), so a client cannot join a room of another brokerage.
Events are broadcast only after the database write succeeds. The database is the source of truth; clients refetch on reconnect, so missed events are recovered.
Limitation: it works with a single server instance. Several instances would need the Socket.IO Redis adapter, which I'd add if scaling. The JWT is checked at connect time only.

9. Frontend is React (Vite) with no router or UI library, to keep it small. Native HTML5 drag and drop is used.
Optimistic UI with server correction; a version check in the client prevents stale updates from overwriting newer ones; the board refetches after a socket reconnect.
Token is kept in localStorage (known XSS trade-off; httpOnly cookies would be safer).
Limitations: native drag and drop doesn't work on touch screens; the list is capped at 200 leads with no pagination yet; the client and platform admin screens are placeholders.

the client portal shows only the case stage and the client's own documents. The client sees document statuses; live updates arrive tomorrow with the background checker. The advisor's view of a lead's documents isn't in the UI yet (the API exists), and I'd add it in the lead detail panel. Limitation: the credential handover is manual (email invite is the next step).

Converting a lead (clientService.js): it does three things inside one transaction, meaning all-or-nothing: link the lead to a new client id, bump the lead's version, and create the user. The key line is the filter clientUserId: null in the update. It only matches a lead that hasn't been converted, so if two advisors click at once, the database lets only one through and the other gets a 409. That answers my earlier question: that filter prevents double conversion.

Uploading (upload.js, documentService.js): multer reads the uploaded file into memory and rejects wrong types and sizes. We then stream the bytes into GridFS (a file store inside MongoDB), and save a small Document record that holds the metadata, the status pending, and the id of the stored file. The route answers immediately, so the client isn't kept waiting.

Downloading (downloadFile): the browser never gets a public link. Every download runs through a query that includes the brokerage, and for clients also their own user id, so someone else's document simply isn't found (404). That answers my other question: sending files through our own endpoint is how the permission check gets applied every time.

React side (api.js, ClientPortal.jsx): FormData is the browser's way to package a file plus text fields. We send the token with each request, and for downloads we fetch the file with the token and then save it, because a normal link can't carry the login header.

