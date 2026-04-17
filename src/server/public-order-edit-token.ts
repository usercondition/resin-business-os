import { createHmac, timingSafeEqual } from "crypto";

import { env } from "@/lib/env";

type EditTokenPayload = {
  v: 1;
  orderId: string;
  exp: number;
};

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

function sign(payloadJson: string) {
  return createHmac("sha256", env.AUTH_SECRET).update(payloadJson).digest("hex");
}

export function createPublicOrderEditToken(orderId: string) {
  const payload: EditTokenPayload = {
    v: 1,
    orderId,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadJson = JSON.stringify(payload);
  const body = Buffer.from(payloadJson, "utf8").toString("base64url");
  return `${body}.${sign(payloadJson)}`;
}

export function verifyPublicOrderEditToken(token: string): EditTokenPayload | null {
  const dot = token.indexOf(".");
  if (dot <= 0) {
    return null;
  }
  const body = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  let payloadJson = "";
  try {
    payloadJson = Buffer.from(body, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = sign(payloadJson);
  if (signature.length !== expected.length) {
    return null;
  }
  try {
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
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
  const p = parsed as Partial<EditTokenPayload>;
  if (p.v !== 1 || typeof p.orderId !== "string" || typeof p.exp !== "number") {
    return null;
  }
  if (Date.now() > p.exp) {
    return null;
  }
  return { v: 1, orderId: p.orderId, exp: p.exp };
}
