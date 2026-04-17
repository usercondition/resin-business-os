import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";

import { handleRouteError, ok, okPage } from "@/lib/api";
import { parsePagination } from "@/lib/pagination/params";
import { requireAuth, requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import {
  listMappingProfiles,
  parseMappingProfile,
  upsertMappingProfile,
} from "@/server/imports/mapping-profile-service";

export async function GET(request: NextRequest) {
  try {
    const actor = requireAuth(request);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "imports:mapping-profiles:list", 60, 60_000);
    if (limited) return limited;

    const pagination = parsePagination(request);
    const profiles = await listMappingProfiles();
    const paged = profiles.slice(pagination.skip, pagination.skip + pagination.take);
    return okPage(paged, {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: profiles.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "imports:mapping-profiles:create", 40, 60_000);
    if (limited) return limited;

    const body = await request.json();
    const parsed = parseMappingProfile(body);

    const profile = await upsertMappingProfile(parsed, actor.userId);
    return ok(profile, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}

