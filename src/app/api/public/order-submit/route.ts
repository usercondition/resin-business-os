import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, handleRouteError, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request-context";
import { createOrder } from "@/server/domain/orders/order-service";
import {
  applyPublicOrderUpdate,
  getPublicOrderPrefill,
} from "@/server/domain/orders/public-order-workflow-service";

const publicCustomerSchema = z
  .object({
    fullName: z.string().min(2),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    preferredContactChannel: z.string().optional(),
    defaultAddress: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine((v) => Boolean(v.email?.trim()) || Boolean(v.phone?.trim()), {
    message: "Provide an email or phone number on the customer section.",
    path: ["email"],
  });

const itemSchema = z.object({
  itemName: z.string().min(1),
  quantity: z.number().int().positive(),
  unitPrice: z.number().nonnegative(),
  materialType: z.string().optional(),
  color: z.string().optional(),
  printSpec: z.record(z.unknown()).optional(),
});

const submitSchema = z.object({
  newCustomer: publicCustomerSchema,
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  tax: z.number().nonnegative().default(0),
  discount: z.number().nonnegative().default(0),
  items: z.array(itemSchema).min(1),
  token: z.string().optional(),
});

function hasNonBlankContact(customer: { email?: string; phone?: string }) {
  return Boolean(String(customer.email ?? "").trim()) || Boolean(String(customer.phone ?? "").trim());
}

export async function GET(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "public:order-submit:get", 50, 60_000);
    if (limited) {
      return limited;
    }
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return fail("Missing token", 400);
    }
    const prefill = await getPublicOrderPrefill(token);
    if (!prefill) {
      return fail("Invalid or expired token", 401);
    }
    return ok(prefill);
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * Public “full order” intake: creates a real Order + line items (and customer if new).
 * Rate-limited; staff should prefer hub entry for sensitive jobs.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "public:order-submit", 8, 60 * 60_000);
    if (limited) {
      return limited;
    }

    const body = submitSchema.parse(await request.json());
    if (!hasNonBlankContact(body.newCustomer)) {
      return fail("Provide an email or phone number on the customer section.", 422);
    }
    const context = getRequestContext(request);
    const order = await createOrder(body, undefined, context);
    return ok(
      {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "public:order-submit:patch", 20, 60_000);
    if (limited) {
      return limited;
    }

    const body = submitSchema.parse(await request.json());
    if (!body.token) {
      return fail("Missing token", 400);
    }
    if (!hasNonBlankContact(body.newCustomer)) {
      return fail("Provide an email or phone number on the customer section.", 422);
    }

    const context = getRequestContext(request);
    const updated = await applyPublicOrderUpdate({
      token: body.token,
      submit: {
        customer: body.newCustomer,
        dueDate: body.dueDate,
        notes: body.notes,
        tax: body.tax,
        discount: body.discount,
        items: body.items,
      },
      requestMeta: context,
    });
    if (updated.kind === "invalid_token") {
      return fail("Invalid or expired token", 401);
    }
    if (updated.kind === "not_found") {
      return fail("Order not found", 404);
    }

    return ok({
      orderId: updated.orderId,
      orderNumber: updated.orderNumber,
      updated: true,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
