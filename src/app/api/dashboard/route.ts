import { NextRequest } from "next/server";

import { fail, handleRouteError, ok } from "@/lib/api";
import { requireAuth } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getDashboardMetrics } from "@/server/analytics/dashboard-service";

function isDatabaseUrlConfigError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("database_url") ||
    message.includes("datasource `db`") ||
    message.includes("the url must start with the protocol `postgresql://`") ||
    message.includes("the url must start with the protocol `postgres://`")
  );
}

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "dashboard:read", 120, 60_000);
    if (limited) return limited;

    const metrics = await getDashboardMetrics();
    return ok(metrics);
  } catch (error) {
    if (isDatabaseUrlConfigError(error)) {
      return fail(
        "Dashboard is unavailable because DATABASE_URL is invalid. Set a Postgres URL that starts with postgresql:// or postgres:// and restart the service.",
        500,
      );
    }
    return handleRouteError(error);
  }
}

