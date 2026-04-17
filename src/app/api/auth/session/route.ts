import { NextRequest, NextResponse } from "next/server";

import { handleRouteError, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/security/auth";
import { SHOP_SESSION_COOKIE, shopSessionCookieOptions } from "@/server/auth/shop-session";

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) {
      return actor;
    }

    const user = await db.user.findUnique({
      where: { id: actor.userId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ ok: false, error: { message: "User not found" } }, { status: 401 });
    }

    return ok(user);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, data: { signedOut: true } });
  res.cookies.set(SHOP_SESSION_COOKIE, "", { ...shopSessionCookieOptions(), maxAge: 0 });
  return res;
}
