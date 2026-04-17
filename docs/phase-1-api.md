# Phase 1 API Surface

Base path: `/api`

## Customers

- `GET /customers?search=`
- `POST /customers`

## Leads

- `GET /leads?status=`
- `POST /leads`

## Orders

- `GET /orders?search=`
- `POST /orders`

## Payments

- `GET /payments?orderId=`
- `POST /payments` (manual payment logging)

## Quotes

- `POST /quotes/approve`

## Webhooks

- `POST /webhooks/n8n` with `x-n8n-signature`

## Notes

- Mutating routes accept optional `x-user-id` header for audit actor attribution.
- Responses follow shape `{ ok: boolean, data?: unknown, error?: { message: string, details?: unknown } }`.
