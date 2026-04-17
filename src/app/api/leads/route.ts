import { NextRequest } from "next/server";
import { LeadStatus, UserRole } from "@prisma/client";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { db } from "@/lib/db";
import { guardRoute } from "@/lib/security/guard";
import { createLead } from "@/server/domain/leads/lead-service";

export async function GET(request: NextRequest) {
  try {
    const guarded = await guardRoute(request, {
      rateLimit: { scope: "leads:list", limit: 120, windowMs: 60_000 },
      parsePaging: true,
    });
    if (guarded instanceof Response) return guarded;

    const statusParam = request.nextUrl.searchParams.get("status");
    const status =
      statusParam && Object.values(LeadStatus).includes(statusParam as LeadStatus)
        ? (statusParam as LeadStatus)
        : undefined;

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where: status ? { status } : undefined,
        include: {
          customer: true,
        },
        orderBy: { updatedAt: "desc" },
        skip: guarded.pagination.skip,
        take: guarded.pagination.take,
      }),
      db.lead.count({ where: status ? { status } : undefined }),
    ]);

    return okPage(leads, {
      page: guarded.pagination.page,
      pageSize: guarded.pagination.pageSize,
      total,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const guarded = await guardRoute(request, {
      roles: [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF],
      rateLimit: { scope: "leads:create", limit: 80, windowMs: 60_000 },
    });
    if (guarded instanceof Response) return guarded;

    const body = await request.json();

    const lead = await createLead(body, guarded.actor.userId, guarded.context);

    return ok(lead, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

