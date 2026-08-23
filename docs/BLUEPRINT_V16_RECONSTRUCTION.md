# MR.ONE V16 Reconstruction Blueprint

Status: ACTIVE BUILD BLUEPRINT

## Frozen inputs
- V15/AppDeploy snapshot: reference only
- OpenAI: archived, not a core dependency
- Jina AI: archived, not a core dependency

## Core providers
1. Gemini — intelligence and multimodal product analysis.
2. Canva — creative/design composition and branded layouts.
3. Dedicated TTS provider — Indonesian voice track; provider selected by technical validation.
4. Meta — Facebook Page distribution.
5. FFmpeg — server-side media assembly.

## Runtime
- AppDeploy is the application/backend runtime.
- GitHub is source control and recovery/source-of-truth for implementation.
- Database stores jobs, approvals, schedules, provider state and publishing records.
- Storage stores media assets.
- Scheduler/worker executes jobs server-side; mobile browser is only a control panel.

## Provider abstraction
Every external provider is behind an adapter. The UI selects a provider; backend adapters validate credentials, invoke the provider, normalize output, and return typed errors. Secrets never enter frontend code or Git history.

## Content pipeline
Input product image/link -> Gemini analysis -> structured product facts -> creative brief -> Canva design/composition -> approval.

## Video pipeline
Approved creative -> 4 independently generated visual scenes -> scene validation -> motion validation -> Indonesian TTS -> music/audio mix -> FFmpeg assembly -> media validation -> final MP4.

The four scenes must have distinct composition and physical/camera/environment motion. A static image with zoom-only treatment is not accepted as a valid scene.

## Job state machine
QUEUED -> ANALYZING -> DESIGNING -> WAITING_APPROVAL -> GENERATING_SCENES -> GENERATING_VOICE -> ASSEMBLING -> VALIDATING -> READY

Any stage may terminate in FAILED with a durable error code/message. Retries are idempotent and stage-scoped.

## Distribution pipeline
READY -> SCHEDULED -> QUEUED_FOR_PUBLISH -> PUBLISHING -> PUBLISHED -> ANALYTICS

No Meta publish is attempted without valid Page authorization.

## Scheduling
Scheduling is internal to MR.ONE. No separate scheduling API key is required. Jobs execute on backend workers even when the user's phone/browser is closed.

## Required provider selections
- Intelligence: Gemini
- Creative: Canva
- Voice: TTS adapter
- Distribution: Meta

## Archived providers
OpenAI and Jina remain archived for possible future adapters/fallbacks but are not required by the primary pipeline.

## Acceptance gates
1. Provider configuration reports exact connected/not-configured state without exposing secrets.
2. Product analysis produces structured supported facts.
3. Canva creative is reviewable before video generation.
4. Four scenes are non-identical and motion-valid.
5. Indonesian voice is embedded as a real final audio track.
6. FFmpeg produces a playable MP4 with video and audio streams.
7. Failed stages never report READY.
8. Schedule survives browser/phone closure.
9. Meta publication requires explicit approval and valid Page credentials.
10. Full E2E test passes before production deployment.
