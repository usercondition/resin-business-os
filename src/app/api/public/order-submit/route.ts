import { NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { fail, handleRouteError, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request-context";
import { createOrder } from "@/server/domain/orders/order-service";
import { createAuditLog } from "@/server/audit/audit-service";
import { verifyPublicOrderEditToken } from "@/server/public-order-edit-token";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";
import { toPrismaJsonOptional } from "@/lib/prisma-json";

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

function clientPayloadFromOrder(order: {
  customer: {
    fullName: string;
    phone: string | null;
    email: string | null;
    preferredContactChannel: string | null;
    defaultAddress: string | null;
    notes: string | null;
  };
  dueDate: Date | null;
  notes: string | null;
  tax: { toString(): string };
  discount: { toString(): string };
  items: Array<{
    itemName: string;
    quantity: number;
    unitPrice: { toString(): string };
    materialType: string | null;
    color: string | null;
    printSpecJson: unknown;
  }>;
}) {
  return {
    customer: {
      fullName: order.customer.fullName,
      phone: order.customer.phone ?? "",
      email: order.customer.email ?? "",
      preferredContactChannel: order.customer.preferredContactChannel ?? "",
      defaultAddress: order.customer.defaultAddress ?? "",
      notes: order.customer.notes ?? "",
    },
    order: {
      dueDate: order.dueDate ? order.dueDate.toISOString().slice(0, 10) : "",
      notes: order.notes ?? "",
      tax: Number(order.tax.toString()),
      discount: Number(order.discount.toString()),
      items: order.items.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice.toString()),
        materialType: i.materialType ?? "",
        color: i.color ?? "",
        printNotes:
          i.printSpecJson && typeof i.printSpecJson === "object" && "notes" in (i.printSpecJson as object)
            ? String((i.printSpecJson as { notes?: unknown }).notes ?? "")
            : "",
      })),
    },
  };
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
    const session = verifyPublicOrderEditToken(token);
    if (!session) {
      return fail("Invalid or expired token", 401);
    }
    const order = await db.order.findUnique({
      where: { id: session.orderId },
      include: { customer: true, items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!order) {
      return fail("Order not found", 404);
    }
    return ok({
      ...clientPayloadFromOrder(order),
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
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
    const session = verifyPublicOrderEditToken(body.token);
    if (!session) {
      return fail("Invalid or expired token", 401);
    }
    if (!hasNonBlankContact(body.newCustomer)) {
      return fail("Provide an email or phone number on the customer section.", 422);
    }

    const context = getRequestContext(request);
    const existing = await db.order.findUnique({
      where: { id: session.orderId },
      include: { customer: true, items: true },
    });
    if (!existing) {
      return fail("Order not found", 404);
    }

    const subtotal = body.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const total = subtotal + body.tax - body.discount;
    const paid = await db.payment.aggregate({
      _sum: { amount: true },
      where: { orderId: existing.id },
    });
    const balanceDue = total - Number(paid._sum.amount ?? 0);

    await db.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: existing.customerId },
        data: {
          fullName: body.newCustomer.fullName.trim(),
          phone: body.newCustomer.phone?.trim() || null,
          email: body.newCustomer.email?.trim() || null,
          preferredContactChannel: body.newCustomer.preferredContactChannel?.trim() || null,
          defaultAddress: body.newCustomer.defaultAddress?.trim() || null,
          notes: body.newCustomer.notes?.trim() || null,
        },
      });

      await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
      await tx.order.update({
        where: { id: existing.id },
        data: {
          dueDate: body.dueDate,
          notes: body.notes?.trim() || null,
          tax: body.tax,
          discount: body.discount,
          subtotal,
          total,
          balanceDue,
          items: {
            create: body.items.map((item, index) => ({
              itemName: item.itemName,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              materialType: item.materialType,
              color: item.color,
              printSpecJson: toPrismaJsonOptional(item.printSpec),
              lineTotal: item.quantity * item.unitPrice,
              sortOrder: index,
            })),
          },
        },
      });
    });

    await createAuditLog({
      entityType: "order",
      entityId: existing.id,
      action: "public_order_form.updated",
      after: { customerId: existing.customerId },
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });
    await appendTimelineEvent({
      entityType: "order",
      entityId: existing.id,
      action: "public_order_form_updated",
      payload: { orderNumber: existing.orderNumber },
      requestId: context.requestId,
    });

    return ok({
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      updated: true,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
