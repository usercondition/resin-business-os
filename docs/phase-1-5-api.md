# Phase 1.5 API Additions

## Status transitions

- `POST /api/orders/status?kind=order` body: `{ orderId, status }`
- `POST /api/orders/status?kind=production` body: `{ orderId, productionStatus }`
- `POST /api/orders/status?kind=delivery` body: `{ orderId, deliveryStatus }`

## Production jobs

- `GET /api/production-jobs?orderId=`
- `POST /api/production-jobs`
- `PATCH /api/production-jobs`

## Deliveries

- `GET /api/deliveries?orderId=`
- `POST /api/deliveries`
- `PATCH /api/deliveries`

## Timeline

- `GET /api/timeline?entityType=&entityId=`

## Import staging

- `POST /api/imports/csv`
- `POST /api/imports/google-sheets`

## Notes

- Status transitions are guarded by server-side transition maps.
- All write operations append audit and timeline entries.
- Import endpoints currently stage data snapshots into `sync_logs` for review/reconciliation.
