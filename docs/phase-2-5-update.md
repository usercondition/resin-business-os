# Phase 2.5 Additions

## Durable staged import rows

- Added `ImportRow` model linked to `SyncLog`
- CSV and Google Sheets staging now persist all rows into `import_rows`

## Mapping profiles

- Added mapping profile service backed by `settings`
- API: `GET/POST /api/imports/mapping-profiles`
- Stage endpoints now accept optional `mappingProfileKey`

## Commit pipeline upgrade

- Commit now reads durable rows from `ImportRow`
- Applies optional mapping profile field map
- Calculates dedupe keys per row
- Stores row-level status (`committed`, `duplicate`, `skipped`)
- Persists summary with `duplicates` count

## Duplicate review queue

- API: `GET/PATCH /api/imports/duplicates`
- UI: `/ops/imports`
- Reviewer can: accept duplicate, force commit (manual merge required), or skip

## Idempotency cleanup

- Service: `idempotency-cleanup-service`
- Endpoint: `POST /api/system/idempotency/cleanup`
- Intended for scheduled job / n8n cron trigger
