# Phase 2 Execution Update

## Idempotency

- Added idempotency persistence model: `IdempotencyKey`
- Added reusable service: `src/server/imports/idempotency-service.ts`
- Applied to endpoints:
  - `POST /api/webhooks/n8n`
  - `POST /api/imports/csv`
  - `POST /api/imports/google-sheets`
  - `POST /api/imports/commit`
- Header convention: `x-idempotency-key`

## Import commit pipeline

- Added `src/server/imports/import-commit-service.ts`
- Added `POST /api/imports/commit`
- Commit behavior:
  - Loads staged rows from `sync_logs.errorDetailsJson.previewRows`
  - Dedupe/upsert for customers and leads
  - Upsert for orders by `orderNumber` or `externalOrderId`
  - Supports `dryRun`
  - Writes commit summary back to `sync_logs`

## Mobile-first ops UI

- Added `src/app/ops/page.tsx`
- Quick actions:
  - Create customer
  - Create lead
  - Quick order entry
  - Update order status
- Added dashboard shortcut link from home page
