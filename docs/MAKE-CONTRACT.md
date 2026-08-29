# MR.ONE — Make Contract v2

## Role
Make is the distributor. It must not generate product content or decide schedules.

## Input
Make consumes queue records from GitHub with:
- `status = READY`
- `date/time <= now` in the configured timezone
- valid `affiliate_link`
- valid `target_facebook`

## Delivery payload
The Facebook post body is assembled from the stored:
- `caption`
- `description`
- `affiliate_link`

Preferred layout:

```text
{caption}

{description}

{affiliate_link}
```

The URL is intentionally placed after the copy so Facebook can detect it as the link target while the post remains readable.

## Processing rules
1. Read a due READY record.
2. Re-read its current state before delivery.
3. If POSTED, stop.
4. Transition to POSTING.
5. Send the prepared payload to the primary Facebook destination.
6. On confirmed success, update the record to POSTED and set `posted_at`.
7. On confirmed failure, update to FAILED and increment `retry_count`.
8. RETRY may process only records explicitly marked for retry.

## Idempotency
The queue `id` is the idempotency key. Never create a new record merely because delivery failed or Make was restarted.

## Cost principle
Use one distribution engine rather than separate scenarios for Shopee, TikTok, Lazada, Iwan, or Istri. Marketplace and target are data fields, not separate Make scenarios.

## Phase 1 boundary
Only the existing primary Facebook connection is used. Buffer and the second Facebook route are deferred.

## Migration rule
Do not switch the existing scheduler from `affiliate/30-day-content.json` until the new queue has been populated and a controlled end-to-end test succeeds.
