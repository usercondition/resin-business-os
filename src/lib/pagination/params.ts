import { NextRequest } from "next/server";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export function parsePagination(request: NextRequest) {
  const pageRaw = Number(request.nextUrl.searchParams.get("page") ?? DEFAULT_PAGE);
  const pageSizeRaw = Number(
    request.nextUrl.searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE,
  );

  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : DEFAULT_PAGE;
  const pageSize =
    Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? Math.min(Math.floor(pageSizeRaw), MAX_PAGE_SIZE)
      : DEFAULT_PAGE_SIZE;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}
