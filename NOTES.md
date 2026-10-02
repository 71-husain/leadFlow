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