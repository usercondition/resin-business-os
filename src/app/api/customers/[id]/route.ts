import { NextRequest } from "next/server";

import { handleRouteError, ok } from "@/lib/api";
import { getCustomerDetail } from "@/server/analytics/detail-service";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const detail = await getCustomerDetail(params.id);
    return ok(detail);
  } catch (error) {
    return handleRouteError(error);
  }
}
