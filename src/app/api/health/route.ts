import { NextResponse } from "next/server";

/**
 * Liveness check — does not import `@/lib/env` so it can confirm the Node process responds
 * even when env validation or the root layout fails elsewhere.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, service: "resin-business-os" });
}
