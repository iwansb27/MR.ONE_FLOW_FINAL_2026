# MR.ONE Queue

Each scheduled product is stored as an independent content record.

Filename convention:

`MR-YYYYMMDD-###.json`

Example:

`queue/2026/08/30/MR-20260830-001.json`

The queue record must conform to `schemas/content-record.schema.json`.

Only records with `status: READY` and a due `date` + `time` are eligible for Make delivery.

Do not store credentials or access tokens in queue records.
