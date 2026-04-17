import { UserRole } from "@prisma/client";
import { NextRequest } from "next/server";

import { fail } from "@/lib/api";
import { env } from "@/lib/env";
import { readShopSessionFromCookie, SHOP_SESSION_COOKIE } from "@/server/auth/shop-session";

export type RequestActor = {
  userId: string;
  role: UserRole;
};

function getActorFromHeaders(request: NextRequest): RequestActor | null {
  const userId = request.headers.get("x-user-id");
  const roleHeader = request.headers.get("x-user-role");

  if (!userId || !roleHeader) {
    return null;
  }

  const role = roleHeader.toUpperCase();
  if (!Object.values(UserRole).includes(role as UserRole)) {
    return null;
  }

  return { userId, role: role as UserRole };
}

/**
 * Resolves the signed shop session cookie first. In production, header-based auth is ignored
 * so browser clients cannot spoof `x-user-id`. Headers remain available in development/test for Vitest.
 */
export function getRequestActor(request: NextRequest): RequestActor | null {
  const fromCookie = readShopSessionFromCookie(request.cookies?.get(SHOP_SESSION_COOKIE)?.value);
  if (fromCookie) {
    return { userId: fromCookie.userId, role: fromCookie.role };
  }

  if (env.APP_ENV !== "production") {
    return getActorFromHeaders(request);
  }

  return null;
}

export function requireAuth(request: NextRequest): RequestActor | Response {
  const actor = getRequestActor(request);
  if (!actor) {
    return fail("Authentication required", 401);
  }
  return actor;
}

export function requireRole(
  request: NextRequest,
  allowed: UserRole[],
): RequestActor | Response {
  const actor = getRequestActor(request);
  if (!actor) {
    return fail("Authentication required", 401);
  }

  if (!allowed.includes(actor.role)) {
    return fail("Insufficient permissions", 403);
  }

  return actor;
}
