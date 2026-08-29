# MR.ONE — MASTER ARCHITECTURE v2

## 1. System boundary

```text
MR.ONE TOOL / BACKEND
        |
        v
   GitHub Queue
        |
        v
      Make
        |
        v
 Facebook Primary
```

MR.ONE owns business logic. GitHub is the persistence/source-of-truth layer for queue records. Make is the delivery engine. Facebook is the presentation layer for the affiliate URL.

## 2. Core components

### MR.ONE application/backend
Responsibilities:
- product research inputs
- product identification and normalization
- description generation
- caption generation
- approval workflow
- schedule assignment
- duplicate-product validation for the same day
- affiliate-link preservation
- queue creation
- status transitions
- retry eligibility

### GitHub
Responsibilities:
- durable queue records
- schemas/contracts
- configuration
- posting logs
- system documentation

### Make
Responsibilities:
- find due READY records
- enforce idempotency before delivery
- send the prepared posting payload to Facebook
- record success/failure
- update GitHub state
- retry only failed records

Make must not become the place where MR.ONE business logic lives.

### Facebook
Receives the prepared copy and affiliate URL. Facebook's native link preview is expected to provide the product image/name/details when the destination permits it.

## 3. Posting payload

The core payload is intentionally minimal:

```text
caption

 description

 affiliate_url
```

No generated media is required for the core path.

## 4. Queue record model

Each scheduled product is one independent record. Three records are created per day, one for each marketplace/time slot.

Required scheduling fields:
- id
- date
- day
- time
- platform
- target_facebook
- status

Required content fields:
- product_name (internal input)
- product_type
- category
- product_context (internal research data)
- description
- caption
- affiliate_link

Operational fields:
- created_at
- updated_at
- posted_at
- error
- retry_count
- last_attempt_at

## 5. Status state machine

```text
DRAFT
  |
  v
REVIEW
  |
  v
APPROVED
  |
  v
READY
  |
  v
POSTING
  |
  +-------> FAILED -------> RETRY
  |                           |
  |                           v
  +------------------------ POSTING
  |
  v
POSTED
```

A record may enter POSTING only when it is READY and due.

## 6. Idempotency

The record ID is the idempotency key. Before sending a post, Make must read the current record state. If the state is POSTED, it must stop and never send the post again.

A successful Facebook delivery must result in a durable POSTED state and posting timestamp.

Timeouts and ambiguous responses must not blindly create a second post. The recovery procedure must check the record/log state before retrying.

## 7. Daily uniqueness

The system must prevent the same product from occupying multiple marketplace slots on the same date. Product identity must be normalized before this validation.

## 8. Phase 1 Facebook routing

Phase 1 has one primary Facebook destination: the already-working Make/Facebook connection. A second account/Page and Buffer are deferred.

The data model keeps `target_facebook` so the routing layer can be expanded later without redesigning the queue.

## 9. Media policy

Media is optional and outside the core contract. Do not add a video/image generation dependency to the Phase 1 distribution engine.

## 10. Legacy compatibility

The existing `affiliate/30-day-content.json` is legacy input for the current Make scheduler. It remains untouched until the new queue is implemented, tested, and migrated.
