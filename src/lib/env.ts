import { z } from "zod";

/** Empty env vars often become "" on hosts like Railway — treat as unset for optional URLs. */
const optionalUrl = z.preprocess(
  (v) => (v === "" || v === undefined || v === null ? undefined : v),
  z.string().url().optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /** Sole-operator sign-in: only this email may request a magic link. */
  APP_OWNER_EMAIL: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().email().optional(),
  ),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    z.string().url().default("http://localhost:3000"),
  ),
  AUTH_SECRET: z.string().min(16),
  GOOGLE_SHEETS_CLIENT_ID: z.string().optional(),
  GOOGLE_SHEETS_CLIENT_SECRET: z.string().optional(),
  N8N_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  /** Dedicated secret for `/api/webhooks/email/inbound` (falls back to `N8N_WEBHOOK_SIGNING_SECRET`). */
  EMAIL_INBOUND_SIGNING_SECRET: z.string().optional(),
  /** n8n Webhook URL (production/test) that receives outbound email jobs from this app */
  N8N_EMAIL_OUTBOUND_WEBHOOK_URL: optionalUrl,
  MESSENGER_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  NEW_REQUEST_NOTIFICATION_WEBHOOK_URL: optionalUrl,
  RATE_LIMIT_REDIS_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

/**
 * During `npm run build`, Next may load server modules that import `env` before Railway injects
 * variables into the build phase. Supply placeholders only for missing required keys in that case.
 */
function rawProcessEnv(): NodeJS.ProcessEnv {
  const isNpmBuild = process.env.npm_lifecycle_event === "build";
  if (!isNpmBuild) {
    return process.env;
  }
  return {
    ...process.env,
    DATABASE_URL:
      process.env.DATABASE_URL ||
      "postgresql://build:build@127.0.0.1:5432/build?schema=public",
    AUTH_SECRET: process.env.AUTH_SECRET || "00000000000000000000000000000000",
  };
}

export const env = envSchema.parse(rawProcessEnv());
