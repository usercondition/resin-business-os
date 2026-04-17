# Full Build Progress (Phases 0-4)

## Delivered

- Phase 0: Foundation scaffold, Prisma schema, env validation, audit/timeline services
- Phase 1: Core APIs for customers, leads, orders, payments, quote approval, n8n webhook
- Phase 1.5: Status transition guards, production jobs, deliveries, timeline API, staging imports
- Phase 2: Idempotency system, import commit endpoint, mobile ops quick-actions UI
- Phase 2.5: Durable import rows, mapping profiles, duplicate review API+UI, idempotency cleanup endpoint
- Phase 3: KPI dashboard API+UI, reminder engine API, customer/order detail APIs + timeline-driven pages
- Phase 4 prep: channel adapter interface, Messenger adapter scaffold, messenger inbound webhook, integration event-bus endpoint

## Key URLs

- `/` home
- `/dashboard` KPI dashboard
- `/ops` quick operations
- `/ops/imports` duplicate review + mapping profiles
- `/customers` customer lookup
- `/orders` order lookup

## Operational reminders

- Run Prisma migration for new models: `IdempotencyKey`, `ImportRow`
- Configure secrets in `.env`
- Hook cron/n8n to `POST /api/system/idempotency/cleanup` and optionally `POST /api/reminders`
