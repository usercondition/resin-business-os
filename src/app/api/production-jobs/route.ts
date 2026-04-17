import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { parsePagination } from "@/lib/pagination/params";
import { requireAuth, requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  createProductionJob,
  listProductionJobs,
  updateProductionJob,
} from "@/server/domain/orders/production-job-service";

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "production-jobs:list", 120, 60_000);
    if (limited) return limited;
    const pagination = parsePagination(request);

    const orderId = request.nextUrl.searchParams.get("orderId") ?? undefined;
    const jobs = await listProductionJobs(orderId);
    const paged = jobs.slice(pagination.skip, pagination.skip + pagination.take);
    return okPage(paged, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: jobs.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "production-jobs:create", 80, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const job = await createProductionJob(body, actor.userId);
    return ok(job, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "production-jobs:update", 80, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const job = await updateProductionJob(body, actor.userId);
    return ok(job);
  } catch (error) {
    return handleRouteError(error);
  }
}

