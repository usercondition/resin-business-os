# Hardening Pass

## Security and access controls

- Added shared auth utilities in `src/lib/security/auth.ts`
  - `requireAuth()`
  - `requireRole()`
- Added role-aware enforcement for critical write endpoints:
  - imports staging/commit/mapping updates/duplicate resolution
  - reminder engine execution
  - event emit endpoint
  - idempotency cleanup endpoint
  - quote approval and order status transitions

## Rate limiting

- Added in-memory limiter in `src/lib/security/rate-limit.ts`
- Applied per-route scope limits to list and mutation endpoints touched in this pass.

## Pagination

- Added shared parser in `src/lib/pagination/params.ts`
- Added paginated response helper `okPage()` in `src/lib/api.ts`
- Applied pagination to high-volume list routes touched in this pass.

## Test scaffolding

- Added Vitest config: `vitest.config.ts`
- Added scripts in `package.json`:
  - `test`
  - `test:watch`
- Added initial unit tests:
  - `tests/auth.test.ts`
  - `tests/rate-limit.test.ts`
  - `tests/pagination.test.ts`

## Notes

- Current auth is header-based (`x-user-id`, `x-user-role`) for development.
- Replace with session/JWT middleware integration when auth provider is wired.
- Rate limiting is process-local (memory). For horizontal scale, move to Redis-based limiter.
## Security hardening round 2

- Added request context utility in `src/lib/security/request-context.ts`
  - standardized `requestId`
  - client IP capture (`x-forwarded-for` / `x-real-ip`)
- Added unified route guard helper in `src/lib/security/guard.ts`
  - auth/role checks
  - rate limit enforcement
  - pagination parse surface
- Propagated request correlation into logs:
  - `createAuditLog()` now records `requestId` in context payload
  - `appendTimelineEvent()` now records `requestId`
- Refactored core operational routes to use guard + context propagation:
  - customers, leads, orders, payments

### Why this matters

This reduces security drift between routes, makes incident traceability easier across API/audit/timeline records, and gives a stable base for plugging in real auth middleware without rewriting each route.
