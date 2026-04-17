import { describe, expect, it } from "vitest";

import { parsePagination } from "@/lib/pagination/params";

function requestWithQuery(query: string): import("next/server").NextRequest {
  return {
    nextUrl: new URL(`https://example.com/api/resource${query}`),
  } as import("next/server").NextRequest;
}

describe("parsePagination", () => {
  it("returns defaults when no params are provided", () => {
    const request = requestWithQuery("");
    const result = parsePagination(request);

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(25);
  });

  it("caps pageSize at max and computes skip", () => {
    const request = requestWithQuery("?page=3&pageSize=999");
    const result = parsePagination(request);

    expect(result.page).toBe(3);
    expect(result.pageSize).toBe(100);
    expect(result.skip).toBe(200);
  });
});
