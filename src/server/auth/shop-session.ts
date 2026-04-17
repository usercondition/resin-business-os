import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { UserRole } from "@prisma/client";

import { env } from "@/lib/env";

export const SHOP_SESSION_COOKIE = "resin_shop_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

type Payload = {
  v: 4;
  uid: string;
  role: UserRole;
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
  if (p.v !== 4 || typeof p.uid !== "string" || typeof p.exp !== "number") {
    return null;
  }
  if (typeof p.role !== "string" || !Object.values(UserRole).includes(p.role as UserRole)) {
    return null;
  }
  if (Date.now() > p.exp) {
    return null;
  }
  return { v: 4, uid: p.uid, role: p.role as UserRole, exp: p.exp };
}

export function createShopSessionToken(userId: string, role: UserRole): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const payloadJson = JSON.stringify({
    v: 4 as const,
    uid: userId,
    role,
    exp,
    jti: randomBytes(8).toString("hex"),
  });
  return signPayload(payloadJson);
}

export function readShopSessionFromCookie(cookieValue: string | undefined): { userId: string; role: UserRole } | null {
  if (!cookieValue) {
    return null;
  }
  const p = verifyToken(cookieValue);
  if (!p) {
    return null;
  }
  return { userId: p.uid, role: p.role };
}

export function shopSessionCookieOptions() {
  return {
    httpOnly: true as const,
    secure: env.APP_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SEC,
  };
}
