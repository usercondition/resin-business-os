import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { env } from "@/lib/env";

export const PORTAL_SESSION_COOKIE = "resin_portal_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

type Payload = {
  v: 1;
  orderId: string;
  exp: number;
};

function signPayload(payloadJson: string): string {
  const sig = createHmac("sha256", env.AUTH_SECRET).update(payloadJson).digest("hex");
  return `${Buffer.from(payloadJson, "utf8").toString("base64url")}.${sig}`;
}

function verifyToken(token: string): Payload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) {
    return null;
  }
  const payloadB64 = token.slice(0, dot);
  const sigHex = token.slice(dot + 1);
  let payloadJson: string;
  try {
    payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expectedSig = createHmac("sha256", env.AUTH_SECRET).update(payloadJson).digest("hex");
  try {
    if (sigHex.length !== expectedSig.length || !timingSafeEqual(Buffer.from(sigHex), Buffer.from(expectedSig))) {
      return null;
    }
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  const p = parsed as Partial<Payload>;
  if (p.v !== 1 || typeof p.orderId !== "string" || typeof p.exp !== "number") {
    return null;
  }
  if (Date.now() > p.exp) {
    return null;
  }
  return { v: 1, orderId: p.orderId, exp: p.exp };
}

export function createPortalSessionToken(orderId: string): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payloadJson = JSON.stringify({ v: 1 as const, orderId, exp, jti: randomBytes(8).toString("hex") });
  return signPayload(payloadJson);
}

export function readPortalSessionFromCookie(cookieValue: string | undefined): Payload | null {
  if (!cookieValue) {
    return null;
  }
  return verifyToken(cookieValue);
}

export function portalCookieOptions() {
  return {
    httpOnly: true as const,
    secure: env.APP_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
