import { createHash, randomBytes } from "crypto";

import { UserRole } from "@prisma/client";

import { HttpError } from "@/lib/api";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { postN8nOutboundEmailWebhook } from "@/server/integrations/n8n/post-outbound-email-webhook";

const TOKEN_TTL_MS = 15 * 60 * 1000;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function assertMagicLinkEmailAllowed(email: string): void {
  if (!env.APP_OWNER_EMAIL) {
    throw new HttpError(
      "APP_OWNER_EMAIL is not configured. Set it to your work email in environment variables.",
      503,
    );
  }
  if (normalizeEmail(email) !== normalizeEmail(env.APP_OWNER_EMAIL)) {
    throw new HttpError("That email is not authorized to sign in.", 403);
  }
}

export async function upsertOwnerUserForMagicLink(email: string) {
  const normalized = normalizeEmail(email);
  return db.user.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      name: normalized.split("@")[0] || "Owner",
      role: UserRole.OWNER,
    },
    update: {},
  });
}

export async function createMagicLinkTokenRow(email: string): Promise<{ rawToken: string; expiresAt: Date }> {
  const normalized = normalizeEmail(email);
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.magicLinkToken.create({
    data: {
      email: normalized,
      tokenHash,
      expiresAt,
    },
  });

  return { rawToken, expiresAt };
}

export async function sendMagicLinkEmail(toEmail: string, signInUrl: string): Promise<{ emailed: boolean }> {
  const subject = "Your Resin Business OS sign-in link";
  const text = `Sign in to Resin Business OS (link expires in 15 minutes):\n\n${signInUrl}\n\nIf you did not request this, you can ignore this email.`;

  const result = await postN8nOutboundEmailWebhook({
    event: "app.magic_link_requested",
    payload: {
      to: toEmail,
      subject,
      text,
      signInUrl,
    },
  });

  return { emailed: result.ok && !result.skipped };
}

export async function consumeMagicLinkToken(rawToken: string): Promise<{ userId: string; role: UserRole }> {
  const tokenHash = hashToken(rawToken);
  const row = await db.magicLinkToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.usedAt || row.expiresAt < new Date()) {
    throw new HttpError("Invalid or expired sign-in link.", 400);
  }

  await db.magicLinkToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });

  const user = await db.user.findUnique({ where: { email: row.email } });
  if (!user || !user.isActive) {
    throw new HttpError("User account is missing or inactive.", 400);
  }

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return { userId: user.id, role: user.role };
}
