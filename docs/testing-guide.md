# Testing and Validation Guide

## Local prerequisites

- Node.js 22+
- npm available in PATH
- Postgres running if you need integration-like API/manual checks

## Install

```bash
npm install
```

## Static and unit checks

```bash
npm run lint
npm run test
```

## Watch mode

```bash
npm run test:watch
```

## Migration-required changes in this branch

Run these before starting the app if schema is behind:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name hardening-and-imports
```

## Security test checklist

- Verify protected endpoints return `401` without `x-user-id` / `x-user-role`
- Verify role-restricted endpoints return `403` with non-admin role
- Verify rate-limited endpoints return `429` after repeated requests
- Verify timeline/audit entries include `requestId` in context
- Verify import endpoints behave idempotently with same `x-idempotency-key`

## Distributed rate limit setup (optional)

Set in `.env`:

- `RATE_LIMIT_REDIS_URL=redis://<host>:<port>`

If unset, in-memory limiter is used.

## CI

GitHub Actions workflow at `.github/workflows/ci.yml` runs:

- `npm install`
- `npm run lint`
- `npm run test`
# Test matrix additions

Added integration-style route tests:

- `tests/api-customers-route.test.ts`
- `tests/api-orders-route.test.ts`
- `tests/api-reminders-route.test.ts`

These cover:

- auth/guard failure paths
- rate-limit failure path handling
- paginated response metadata for list routes
- propagation of request context (`requestId`, `ipAddress`) into service calls

Also added script:

- `npm run validate` => lint + tests
## Coverage and route test expansion

### New route integration-style tests

- `tests/api-orders-status-route.test.ts`
- `tests/api-imports-commit-route.test.ts`
- `tests/api-imports-csv-route.test.ts`

### Coverage tooling

- Added script: `npm run test:coverage`
- Vitest coverage configured (v8 provider) in `vitest.config.ts`
- CI now runs coverage and uploads `coverage/` artifact

### Recommended local command sequence

```bash
npm run lint
npm run test
npm run test:coverage
```
