import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  APP_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  AUTH_SECRET: z.string().min(16),
  GOOGLE_SHEETS_CLIENT_ID: z.string().optional(),
  GOOGLE_SHEETS_CLIENT_SECRET: z.string().optional(),
  N8N_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  /** Dedicated secret for `/api/webhooks/email/inbound` (falls back to `N8N_WEBHOOK_SIGNING_SECRET`). */
  EMAIL_INBOUND_SIGNING_SECRET: z.string().optional(),
  /** n8n Webhook URL (production/test) that receives outbound email jobs from this app */
  N8N_EMAIL_OUTBOUND_WEBHOOK_URL: z.string().url().optional(),
  MESSENGER_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  NEW_REQUEST_NOTIFICATION_WEBHOOK_URL: z.string().url().optional(),
  RATE_LIMIT_REDIS_URL: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
