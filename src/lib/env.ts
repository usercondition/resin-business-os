import { z } from "zod";

/**
 * Optional HTTP(S) URLs in Railway are often pasted without a scheme — Zod `.url()` rejects those.
 * Invalid / malformed values are treated as unset so one bad variable cannot take down the whole app.
 */
function normalizeOptionalHttpUrl(v: unknown): unknown {
  if (v === "" || v === undefined || v === null) {
    return undefined;
  }
  const raw = String(v).trim();
  if (!raw) {
    return undefined;
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = z.string().url().safeParse(withScheme);
  return parsed.success ? withScheme : undefined;
}

/** Empty env vars often become "" on hosts like Railway — treat as unset for optional URLs. */
const optionalUrl = z.preprocess(normalizeOptionalHttpUrl, z.string().url().optional());

const optionalNonEmpty = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.string().min(1).optional(),
);

/** Prisma requires `postgresql://` or `postgres://` — not SQLite, not a host-only string. */
const postgresDatabaseUrl = z
  .string()
  .min(1, "DATABASE_URL is required")
  .refine(
    (v) => v.startsWith("postgresql://") || v.startsWith("postgres://"),
    "DATABASE_URL must be a PostgreSQL connection string starting with postgresql:// or postgres:// (copy from .env.example and point at your local or hosted Postgres)",
  );

/** Railway/UI often omits the scheme; Zod `.url()` requires `https://` or `http://`. */
function normalizeAppUrlInput(v: unknown): unknown {
  if (v === "" || v === undefined || v === null) {
    return undefined;
  }
  const s = String(v).trim();
  if (!s) {
    return undefined;
  }
  if (/^https?:\/\//i.test(s)) {
    return s;
  }
  return `https://${s}`;
}

/** Invalid optional emails (typos in Railway) should not crash boot — treat as unset. */
function normalizeOptionalEmail(v: unknown): unknown {
  if (v === "" || v === undefined || v === null) {
    return undefined;
  }
  const s = String(v).trim();
  if (!s) {
    return undefined;
  }
  return z.string().email().safeParse(s).success ? s : undefined;
}

const envSchema = z.object({
  DATABASE_URL: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), postgresDatabaseUrl),
  /** Sole-operator sign-in: only this email may request a magic link. */
  APP_OWNER_EMAIL: z.preprocess(normalizeOptionalEmail, z.string().email().optional()),
  /**
   * Receives Resend alerts when someone submits the public inquiry or print-request form.
   * If unset, falls back to `APP_OWNER_EMAIL` when Resend is configured.
   */
  NEW_REQUEST_NOTIFICATION_EMAIL: z.preprocess(normalizeOptionalEmail, z.string().email().optional()),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.preprocess(
    normalizeAppUrlInput,
    z.string().url().default("http://localhost:3000"),
  ),
  AUTH_SECRET: z.preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(16)),
  GOOGLE_SHEETS_CLIENT_ID: z.string().optional(),
  GOOGLE_SHEETS_CLIENT_SECRET: z.string().optional(),
  N8N_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  /** Dedicated secret for `/api/webhooks/email/inbound` (falls back to `N8N_WEBHOOK_SIGNING_SECRET`). */
  EMAIL_INBOUND_SIGNING_SECRET: z.string().optional(),
  /**
   * Optional alias for the same secret n8n stores as `RESIN_EMAIL_WEBHOOK_SECRET` (Settings → Variables).
   * Lets you use one variable name on Railway and n8n without duplicating values under two keys.
   */
  RESIN_EMAIL_WEBHOOK_SECRET: z.string().optional(),
  /** n8n Webhook URL (production/test) that receives outbound email jobs from this app */
  N8N_EMAIL_OUTBOUND_WEBHOOK_URL: optionalUrl,
  /** Resend API key (`re_...`). When set with `RESEND_FROM`, outbound reply/forward/magic-link email is sent via Resend instead of n8n. */
  RESEND_API_KEY: optionalNonEmpty,
  /**
   * Verified sender, e.g. `Acme <orders@yourdomain.com>`.
   * With `RESEND_API_KEY`, also used for staff email alerts on new public inquiry / print-request submissions when a recipient email is configured.
   */
  RESEND_FROM: optionalNonEmpty,
  /** Svix signing secret from the Resend webhook used for `/api/webhooks/resend`. */
  RESEND_WEBHOOK_SECRET: optionalNonEmpty,
  MESSENGER_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  NEW_REQUEST_NOTIFICATION_WEBHOOK_URL: optionalUrl,
  RATE_LIMIT_REDIS_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

/** Valid Prisma URL for `next build` / Docker when no real DB is wired at compile time. */
const BUILD_PLACEHOLDER_DATABASE_URL = "postgresql://build:build@127.0.0.1:5432/build?schema=public";

/**
 * True while Next is compiling (`next build`). Docker/CI workers sometimes omit
 * `npm_lifecycle_event`; Next sets `NEXT_PHASE` (use bracket access so it is not inlined to undefined).
 *
 * Optional: set `RESIN_OS_COMPILE_STAGE=1` only in your **Dockerfile build stage** (not runtime) if the
 * image still fails to detect compile phase.
 */
function isCompilerBuildPhase(): boolean {
  if (process.env.RESIN_OS_COMPILE_STAGE === "1") {
    return true;
  }
  if (process.env.npm_lifecycle_event === "build") {
    return true;
  }
  const lifecycleScript = process.env.npm_lifecycle_script ?? "";
  if (lifecycleScript.includes("next build")) {
    return true;
  }
  const phase = process.env["NEXT_PHASE"];
  return phase === "phase-production-build" || phase === "phase-development-build";
}

function isValidPostgresUrl(value: string | undefined): boolean {
  if (!value?.trim()) {
    return false;
  }
  const v = value.trim();
  return v.startsWith("postgresql://") || v.startsWith("postgres://");
}

function hasProductionAuthSecret(): boolean {
  const s = process.env.AUTH_SECRET?.trim();
  return typeof s === "string" && s.length >= 16;
}

/**
 * During `npm run build` / Docker build, Next loads server modules that import `env` before
 * runtime env (e.g. Railway `DATABASE_URL`) exists. Use placeholders only in that compile phase.
 *
 * When both a valid Postgres URL and a real `AUTH_SECRET` are set, always use them — never apply
 * compile-only heuristics (`NEXT_PHASE`, `RESIN_OS_COMPILE_STAGE`, etc.) so a mis-set platform
 * env cannot affect a running deployment.
 */
function rawProcessEnv(): NodeJS.ProcessEnv {
  if (isValidPostgresUrl(process.env.DATABASE_URL) && hasProductionAuthSecret()) {
    return {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL!.trim(),
    };
  }

  if (!isCompilerBuildPhase()) {
    return process.env;
  }

  const dbFromEnv = process.env.DATABASE_URL;
  const databaseUrl = isValidPostgresUrl(dbFromEnv) ? dbFromEnv!.trim() : BUILD_PLACEHOLDER_DATABASE_URL;

  return {
    ...process.env,
    DATABASE_URL: databaseUrl,
    AUTH_SECRET: process.env.AUTH_SECRET || "00000000000000000000000000000000",
  };
}

function loadEnv() {
  const raw = rawProcessEnv();
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("[resin-business-os] Invalid environment variables:", parsed.error.flatten());
    console.error("[resin-business-os] Fix Railway variables: DATABASE_URL, AUTH_SECRET (16+ chars), APP_URL (https://…).");
    throw new Error(
      "Environment validation failed. Set DATABASE_URL (postgresql://…), AUTH_SECRET (min 16 characters), and APP_URL (full URL including https://). See server logs above.",
    );
  }
  return parsed.data;
}

export const env = loadEnv();
