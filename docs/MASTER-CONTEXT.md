# MR.ONE — MASTER CONTEXT v2

## Purpose
MR.ONE is an affiliate content and distribution system. Its core job is to research/select products, prepare persuasive copy, queue approved content, and distribute it to Facebook.

## Core principle
MR.ONE thinks. GitHub stores the queue and system state. Make delivers. Facebook presents the affiliate URL.

## Media decision
MR.ONE does **not** generate image or video media by default. Facebook's native link preview is the primary presentation layer. Product name/specifications/features are internal inputs used to create the caption and description; they are not repeated as separate content elements in the Facebook post.

JSON2Video and FFmpeg are not part of the core workflow. Existing JSON2Video code is retained for now and must not be invoked by the core distribution flow.

## Daily schedule
- 07:00 — Shopee
- 15:00 — TikTok
- 21:00 — Lazada

The three products must be different on the same day.

## Marketplace rules
### Shopee
MR.ONE researches the product. Iwan selects the seller/Mall/Official. The affiliate link supplied by Iwan is preserved exactly.

### Lazada
MR.ONE researches the product. Iwan may choose the seller. Product identity is based on the researched product, not the seller.

### TikTok
Iwan searches for the product in the TikTok app and provides the product name plus the TikTok reference/link. MR.ONE uses the product information to prepare copy. The TikTok link is not treated as an affiliate source to analyze.

## Facebook target
Phase 1 uses the already-working primary Facebook connection/page. A second Facebook route/Buffer is intentionally deferred.

## Content output
The Facebook post payload is:
1. Caption
2. Description
3. Affiliate URL

The affiliate URL is placed after the copy. Facebook is responsible for generating its native link preview when supported by the destination URL.

## Lifecycle
DRAFT -> REVIEW -> APPROVED -> READY -> POSTING -> POSTED

Failure path:
POSTING -> FAILED -> RETRY -> POSTING

Only the failed record is retried.

## Idempotency
Every content record has a unique ID in the form `MR-YYYYMMDD-###`. A record that is already POSTED must never be posted again by a retry, timeout recovery, or repeated scenario execution.

## Automation principle
Make is a distributor, not the business logic engine. Make must not perform product research, content generation, scheduling decisions, marketplace selection, rotation calculations, or TikTok analysis.

## Current repository
`iwansb27/MR.ONE_FLOW_FINAL_2026`

## Current Make integration
The existing Make scheduler currently reads the legacy file `affiliate/30-day-content.json`. This file is preserved until the new queue contract is implemented and verified. Do not delete it as part of the foundation build.

## Safety rule
Do not activate or modify the Make scenarios as part of the GitHub foundation build. Make changes happen only after the GitHub queue contract is validated.
