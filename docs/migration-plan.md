# Migration Safety Plan

## Data sources

- Existing tracker app database/export
- Google Sheets workflow
- Scraper outputs (CSV/JSON)
- n8n execution payload snapshots

## Safe migration sequence

1. Export immutable snapshots of each source.
2. Load into staging tables with source identifiers preserved.
3. Run mapping pass to normalized schema.
4. Reconcile counts and totals (leads, orders, payments, balances).
5. Dry-run timeline reconstruction and spot-check records.
6. Freeze legacy writes for cutover window.
7. Run final delta import.
8. Switch read/write traffic to new app.
9. Keep rollback snapshots for 2 weeks.

## Reconciliation checks

- Customer count matches expected range
- Open lead count by source is within tolerance
- Order totals and payment totals match source sums
- No order has negative balance due
- Status values map only to supported enum values
