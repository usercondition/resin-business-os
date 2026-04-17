import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  assertMagicLinkEmailAllowed,
  createMagicLinkTokenRow,
  sendMagicLinkEmail,
  upsertOwnerUserForMagicLink,
} from "@/server/auth/magic-link-service";

const bodySchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "auth:magic-link", 8, 60_000);
    if (limited) {
      return limited;
    }

    const body = bodySchema.parse(await request.json());
    assertMagicLinkEmailAllowed(body.email);
    await upsertOwnerUserForMagicLink(body.email);
    const { rawToken } = await createMagicLinkTokenRow(body.email);
    const next = safeNextPath(body.next);
    const signInUrl = `${env.APP_URL.replace(/\/$/, "")}/login/verify?token=${encodeURIComponent(rawToken)}&next=${encodeURIComponent(next)}`;
    const { emailed } = await sendMagicLinkEmail(body.email, signInUrl);

    if (!emailed && env.APP_ENV === "development") {
      // eslint-disable-next-line no-console
      console.info("[auth:magic-link] outbound email not configured; sign-in URL:", signInUrl);
    }

    return ok({
      message: emailed
        ? "Check your email for a sign-in link (valid for 15 minutes)."
        : "Outbound email is not configured. In development, the sign-in URL is printed in the server log.",
      devSignInUrl: env.APP_ENV === "development" ? signInUrl : undefined,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
