# Step-by-step troubleshooting

Use this guide when something fails locally or on Railway. Work **top to bottom** within each section until the step passes.

---

## A. Can’t open the app in the browser (local)

### A1. Is the dev server running?

1. Open a terminal.
2. `cd` into the project folder (`resin-business-os`).
3. Run: `npm run dev`
4. Wait until you see **Ready** and a line like **Local: http://localhost:3000** (or another port).

**If the command errors:** read the error text (missing `node_modules` → run `npm install`).

### A2. Are you using the correct URL?

1. In the terminal output, find **Local:** — that is the URL you must use.
2. If it says port **3001** (or another number) because **3000 is in use**, open **that** URL (e.g. `http://localhost:3001`).
3. Use **`http://`**, not `https://`, unless you configured HTTPS yourself.
4. Try **`http://127.0.0.1:PORT`** if `localhost` behaves oddly.

### A3. Still “can’t connect” / refused?

1. Confirm the `npm run dev` terminal is **still open** and shows **Ready** (not crashed).
2. Temporarily disable VPN or strict firewall rules for local ports.
3. Close other apps that might use the same port, or always use the port Next prints.

---

## B. Page loads but shows 500 / “Internal Server Error”

### B1. Check required environment variables

The app validates env at startup. Required for normal operation:

| Variable         | Notes |
|-----------------|--------|
| `DATABASE_URL`  | Full PostgreSQL URL: must start with `postgresql://` or `postgres://`. |
| `AUTH_SECRET`   | At least **16 characters**. |

Optional but often set: `APP_URL` (your public URL; bare hostname is OK — the app can add `https://`).

1. Copy `.env.example` to `.env` if you don’t have `.env`.
2. Fill `DATABASE_URL` and `AUTH_SECRET`.
3. Restart `npm run dev`.

### B2. Read the server log

1. Look at the **same terminal** where `npm run dev` is running.
2. Reproduce the error (reload the page).
3. Find lines starting with **`[resin-business-os]`** or stack traces mentioning **`env`** / **`Zod`**.

**Typical fix:** fix the variable name or value in `.env`, then restart the dev server.

---

## C. Prisma: “The table `public.Customer` does not exist” (or similar)

This means the database **exists**, but **schema migrations were never applied** (or you’re pointed at the wrong/empty database).

### C1. Confirm Postgres is reachable

1. Check `DATABASE_URL` in `.env` — host, port, database name, user, and password must match a running Postgres instance.
2. From the project folder run:

   ```bash
   npx prisma migrate deploy
   ```

3. **Success:** you should see migrations applied with no `P1001` / connection errors.

### C2. If `migrate deploy` says “Can’t reach database server”

1. Start PostgreSQL (local service or Docker), **or** fix the host/port in `DATABASE_URL`.
2. On Windows, confirm the host isn’t a stale IP (e.g. old LAN address).
3. Retry `npx prisma migrate deploy`.

### C3. After migrations succeed

1. Restart `npm run dev`.
2. Retry the action (e.g. submit inquiry).

### C4. First-time local database (development)

If you prefer the interactive dev workflow:

```bash
npx prisma migrate dev
```

That applies migrations and regenerates the client as needed.

---

## D. Railway (production / hosted)

### D1. Postgres service

1. The **`DATABASE_URL`** for the **web** service must come from Railway’s **PostgreSQL** plugin (reference the variable), **not** from your app’s public URL.
2. Port should be **`5432`** for Postgres, not `8080`.

### D2. Migrations on deploy

1. This repo’s `railway.toml` includes `releaseCommand = "npx prisma migrate deploy"`.
2. In Railway **Deploy logs**, open the **Release** phase — confirm migrate **succeeded**.
3. If release fails, the database may be missing tables even if the app **starts**.

### D3. 500 on every route

1. Open **Variables** on the web service — confirm `DATABASE_URL`, `AUTH_SECRET`, and ideally `APP_ENV=production` and `APP_URL`.
2. Open **Deploy → Logs** (runtime) and look for env validation or Prisma errors.

---

## E. Public inquiry / forms fail after deploy

1. Complete **Section C** (migrations) on the **same** database Railway uses.
2. Complete **Section B** (env) so `DATABASE_URL` and `AUTH_SECRET` are set on the web service.
3. Check **runtime logs** at the time of the request for Prisma or validation errors.

---

## F. Quick reference commands

| Goal | Command |
|------|---------|
| Install dependencies | `npm install` |
| Regenerate Prisma Client | `npx prisma generate` |
| Apply migrations (CI / prod style) | `npx prisma migrate deploy` |
| Apply migrations (local dev, interactive) | `npx prisma migrate dev` |
| Validate Prisma schema | `npx prisma validate` |
| Run app locally | `npm run dev` |
| Lint + tests | `npm run validate` |

---

## G. Still stuck?

1. Note **exact** error text (or screenshot of the terminal).
2. Say whether it’s **local** or **Railway**.
3. For database errors, include whether **`npx prisma migrate deploy`** **succeeds** or the **full error** (redact passwords in `DATABASE_URL`).
