import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request-context";
import { createAuditLog } from "@/server/audit/audit-service";
import { createLead } from "@/server/domain/leads/lead-service";
import { notifyNewPrintRequest } from "@/server/notifications/request-notifier";
import { createPublicOrderEditToken } from "@/server/public-order-edit-token";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

const inquirySchema = z
  .object({
    fullName: z.string().min(2),
    phone: z.string().min(7).optional(),
    email: z.string().email().optional(),
    preferredContactChannel: z.enum(["messenger", "text", "email"]).optional(),
    subject: z.string().min(2).max(200),
    message: z.string().min(10).max(8000),
    budget: z.number().nonnegative().optional(),
    dueDate: z.coerce.date().optional(),
    website: z.string().optional(),
    startedAt: z.coerce.number().optional(),
  })
  .refine((v) => Boolean(v.email?.trim()) || Boolean(v.phone?.trim()), {
    message: "Provide an email or a phone number so we can reach you.",
    path: ["email"],
  });

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "public:inquiry", 25, 60_000);
    if (limited) {
      return limited;
    }

    const parsed = inquirySchema.parse(await request.json());
    const context = getRequestContext(request);
    let abuseScore = 0;
    if (parsed.website && parsed.website.trim().length > 0) {
      abuseScore += 5;
    }
    if (parsed.startedAt && Date.now() - parsed.startedAt < 2500) {
      abuseScore += 2;
    }
    if (parsed.message.toLowerCase().includes("http://") || parsed.message.toLowerCase().includes("https://")) {
      abuseScore += 1;
    }
    if (abuseScore >= 3) {
      return ok({ submitted: true, filtered: true });
    }

    let customer =
      (parsed.email
        ? await db.customer.findFirst({
            where: { email: parsed.email },
          })
        : null) ??
      (parsed.phone
        ? await db.customer.findFirst({
            where: { phone: parsed.phone },
          })
        : null);

    if (!customer) {
      customer = await db.customer.create({
        data: {
          fullName: parsed.fullName,
          phone: parsed.phone,
          email: parsed.email,
          preferredContactChannel: parsed.preferredContactChannel,
          notes: "Auto-created from public inquiry form",
          tagsJson: ["inquiry"],
        },
      });
    } else {
      customer = await db.customer.update({
        where: { id: customer.id },
        data: {
          fullName: parsed.fullName || customer.fullName,
          preferredContactChannel:
            parsed.preferredContactChannel ?? customer.preferredContactChannel ?? undefined,
        },
      });
    }

    const lead = await createLead(
      {
        customerId: customer.id,
        source: "public_inquiry",
        title: parsed.subject,
        description: [
          parsed.message,
          `Budget: ${parsed.budget ?? "N/A"}`,
          `Due: ${parsed.dueDate ? parsed.dueDate.toISOString() : "N/A"}`,
        ].join("\n\n"),
        estimatedValue: parsed.budget,
        nextFollowUpAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
      undefined,
      context,
    );

    const draftSubtotal = Number(parsed.budget ?? 0);
    const draftOrder = await db.order.create({
      data: {
        customerId: customer.id,
        leadId: lead.id,
        orderNumber: `INQ-${new Date().getFullYear()}-${lead.id.slice(-8).toUpperCase()}`,
        notes: [
          `Draft from inquiry: ${parsed.subject}`,
          parsed.message,
          `Budget: ${parsed.budget ?? "N/A"}`,
          `Due: ${parsed.dueDate ? parsed.dueDate.toISOString() : "N/A"}`,
        ].join("\n\n"),
        dueDate: parsed.dueDate,
        subtotal: draftSubtotal,
        tax: 0,
        discount: 0,
        total: draftSubtotal,
        balanceDue: draftSubtotal,
        items: {
          create: [
            {
              itemName: parsed.subject,
              quantity: 1,
              unitPrice: draftSubtotal,
              lineTotal: draftSubtotal,
              sortOrder: 0,
              printSpecJson: {
                inquiryMessage: parsed.message,
              },
            },
          ],
        },
      },
    });

    await appendTimelineEvent({
      entityType: "customer",
      entityId: customer.id,
      action: "inquiry_submitted",
      payload: { leadId: lead.id, subject: parsed.subject, orderId: draftOrder.id },
      requestId: context.requestId,
    });
    await appendTimelineEvent({
      entityType: "order",
      entityId: draftOrder.id,
      action: "inquiry_order_draft_created",
      payload: { leadId: lead.id, subject: parsed.subject },
      requestId: context.requestId,
    });

    await createAuditLog({
      entityType: "public_form",
      entityId: lead.id,
      action: "inquiry.received",
      after: { customerId: customer.id, leadId: lead.id },
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      context: { abuseScore },
    });

    await notifyNewPrintRequest({
      customerId: customer.id,
      leadId: lead.id,
      fullName: parsed.fullName,
      preferredContactChannel: parsed.preferredContactChannel,
      summary: `Inquiry: ${parsed.subject} (draft order ${draftOrder.orderNumber})`,
    });

    const editToken = createPublicOrderEditToken(draftOrder.id);
    const editOrderLink = `${request.nextUrl.origin}/public/order-form?token=${encodeURIComponent(editToken)}`;

    return ok({
      submitted: true,
      customerId: customer.id,
      leadId: lead.id,
      draftOrderId: draftOrder.id,
      draftOrderNumber: draftOrder.orderNumber,
      editOrderLink,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
