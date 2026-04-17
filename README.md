# Resin Business OS

Phase 0 implementation scaffold for your resin printing operations app.

## What is included

- Next.js + TypeScript app shell
- Prisma schema with normalized business models
- Validation layer using Zod
- Modular domain service folders
- Audit log and timeline service hooks
- Manual payment logging service (Cash App, Venmo, Zelle)
- Integration service entry point for Sheets, n8n, and future connectors

## Setup (after npm is available)

1. Copy `.env.example` to `.env` and fill values.
2. Install dependencies:
   - `npm install`
3. Generate Prisma client:
   - `npm run prisma:generate`
4. Run first migration:
   - `npm run prisma:migrate -- --name init`
5. Start app:
   - `npm run dev`

## Phase 0 next steps

- Add API route handlers for customers, leads, orders, payments
- Add webhook endpoint with signature verification and idempotency
- Add Google Sheets import staging + mapper service
- Add quick mobile order-entry UI
