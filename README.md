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

## Deploy on Railway

1. Create a **PostgreSQL** plugin on the Railway project and copy its **`DATABASE_URL`** into the service variables (Railway usually wires this automatically when both are in the same project).
2. Set **`AUTH_SECRET`** to a random string of at least 16 characters.
3. Set **`APP_ENV`** to `production` and **`APP_URL`** to your public Railway URL (e.g. `https://your-service.up.railway.app`).
4. Redeploy. The repo includes **`railway.toml`**: `releaseCommand` runs **`npx prisma migrate deploy`**, then **`npm run start`** runs Next.js on **`PORT`**.
5. Optional webhook URLs (`N8N_*`, etc.): leave unset or omit — empty strings in Railway are treated as unset for optional URL fields.

If the build still fails, open the **Deploy → Build logs** and check for Prisma, missing env, or ESLint errors; paste the last ~30 lines if you need help interpreting them.

## Phase 0 next steps

- Add API route handlers for customers, leads, orders, payments
- Add webhook endpoint with signature verification and idempotency
- Add Google Sheets import staging + mapper service
- Add quick mobile order-entry UI
