import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { db } from "@/lib/db";
import { guardRoute } from "@/lib/security/guard";
import { createCustomer } from "@/server/domain/customers/customer-service";

export async function GET(request: NextRequest) {
  try {
    const guarded = await guardRoute(request, {
      rateLimit: { scope: "customers:list", limit: 120, windowMs: 60_000 },
      parsePaging: true,
    });
    if (guarded instanceof Response) return guarded;

    const search = request.nextUrl.searchParams.get("search") ?? undefined;

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where: search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { fullName: "asc" },
        skip: guarded.pagination.skip,
        take: guarded.pagination.take,
      }),
      db.customer.count({
        where: search
          ? {
              OR: [
                { fullName: { contains: search, mode: "insensitive" } },
                { phone: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
              ],
            }
          : undefined,
      }),
    ]);

    return okPage(customers, {
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
      rateLimit: { scope: "customers:create", limit: 60, windowMs: 60_000 },
    });
    if (guarded instanceof Response) return guarded;

    const body = await request.json();

    const customer = await createCustomer(body, guarded.actor.userId, guarded.context);

    return ok(customer, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
