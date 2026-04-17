import { NextRequest } from "next/server";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request-context";
import { createAuditLog } from "@/server/audit/audit-service";
import { createLead } from "@/server/domain/leads/lead-service";
import { notifyNewPrintRequest } from "@/server/notifications/request-notifier";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

const requestItemSchema = z.object({
  itemType: z.string().min(2),
  quantity: z.number().int().positive(),
  color: z.string().optional(),
  material: z.string().optional(),
});

const printRequestSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional(),
  preferredContactChannel: z.enum(["messenger", "text", "email"]).optional(),
  items: z.array(requestItemSchema).min(1),
  budget: z.number().nonnegative().optional(),
  dueDate: z.coerce.date().optional(),
  notes: z.string().optional(),
  website: z.string().optional(),
  startedAt: z.coerce.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "public:print-request", 20, 60_000);
    if (limited) return limited;

    const parsed = printRequestSchema.parse(await request.json());
    const context = getRequestContext(request);
    let abuseScore = 0;

    if (parsed.website && parsed.website.trim().length > 0) {
      abuseScore += 5;
    }
    if (parsed.startedAt && Date.now() - parsed.startedAt < 2500) {
      abuseScore += 2;
    }
    if ((parsed.notes ?? "").toLowerCase().includes("http://")) {
      abuseScore += 1;
    }

    if (abuseScore >= 3) {
      return ok({
        submitted: true,
        filtered: true,
      });
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
          notes: "Auto-created from public print request form",
          tagsJson: ["print_request"],
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
        source: "client_print_form",
        title: `${parsed.items[0].itemType} request (${parsed.items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        )})`,
        description: [
          `Items: ${parsed.items
            .map(
              (item) =>
                `${item.itemType} x${item.quantity} (${item.material ?? "material n/a"}, ${item.color ?? "color n/a"})`,
            )
            .join("; ")}`,
          `Budget: ${parsed.budget ?? "N/A"}`,
          `Due: ${parsed.dueDate ? parsed.dueDate.toISOString() : "N/A"}`,
          `Notes: ${parsed.notes ?? "N/A"}`,
        ].join(" | "),
        estimatedValue: parsed.budget,
        nextFollowUpAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
      undefined,
      context,
    );

    await appendTimelineEvent({
      entityType: "customer",
      entityId: customer.id,
      action: "print_request_submitted",
      payload: {
        leadId: lead.id,
        items: parsed.items,
      },
      requestId: context.requestId,
    });

    await createAuditLog({
      entityType: "public_form",
      entityId: lead.id,
      action: "print_request.received",
      after: {
        customerId: customer.id,
        leadId: lead.id,
      },
      requestId: context.requestId,
      ipAddress: context.ipAddress,
      context: { abuseScore },
    });

    await notifyNewPrintRequest({
      customerId: customer.id,
      leadId: lead.id,
      fullName: parsed.fullName,
      preferredContactChannel: parsed.preferredContactChannel,
      summary: `${parsed.items.length} item(s) requested`,
    });

    return ok({
      submitted: true,
      customerId: customer.id,
      leadId: lead.id,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
