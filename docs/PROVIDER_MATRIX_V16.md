# MR.ONE V16 Provider Matrix

| Layer | Primary | Required credential | Output |
|---|---|---|---|
| Intelligence | Gemini | GEMINI_API_KEY | structured facts, brief, copy |
| Creative | Canva | Canva OAuth/connection | design/creative asset |
| Voice | TTS adapter | provider-specific credential if required | MP3/WAV voice |
| Media assembly | FFmpeg | none | MP4 |
| Runtime | AppDeploy | platform runtime | API/jobs/storage/db |
| Distribution | Meta | Page OAuth/Page access token | published post |
| Scheduling | MR.ONE backend | none | durable scheduled jobs |

## Rules
- Credentials are backend-only secrets.
- Provider selection is explicit and persisted with each job.
- Provider failures are normalized into typed errors.
- No provider is considered configured merely because its UI selection exists.
- Archived OpenAI/Jina are not required for the primary path.
