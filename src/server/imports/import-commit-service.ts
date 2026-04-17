import { z } from "zod";

import { db } from "@/lib/db";

const commitImportSchema = z.object({
  syncLogId: z.string().cuid(),
  dryRun: z.boolean().default(false),
});

type GenericRow = Record<string, unknown>;

type MappingProfile = {
  fieldMap?: Record<string, string>;
};

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function applyMapping(row: GenericRow, mappingProfile: MappingProfile | null): GenericRow {
  if (!mappingProfile?.fieldMap) {
    return row;
  }

  const mapped: GenericRow = { ...row };
  for (const [targetKey, sourceKey] of Object.entries(mappingProfile.fieldMap)) {
    if (Object.prototype.hasOwnProperty.call(row, sourceKey)) {
      mapped[targetKey] = row[sourceKey];
    }
  }

  return mapped;
}

function buildDedupeKey(entityType: string, row: GenericRow): string | null {
  if (entityType === "customer") {
    const email = asString(row.email);
    const phone = asString(row.phone);
    if (email) return `customer:email:${email.toLowerCase()}`;
    if (phone) return `customer:phone:${phone}`;
    return null;
  }

  if (entityType === "lead") {
    const source = asString(row.source) ?? "import";
    const externalId = asString(row.externalSourceId) ?? asString(row.externalId);
    if (externalId) return `lead:${source}:${externalId}`;
    return null;
  }

  const orderNumber = asString(row.orderNumber) ?? asString(row.externalOrderId);
  if (orderNumber) return `order:${orderNumber}`;
  return null;
}

async function upsertCustomerFromRow(row: GenericRow, dryRun: boolean) {
  const fullName = asString(row.fullName) ?? asString(row.name) ?? "Unknown Customer";
  const phone = asString(row.phone);
  const email = asString(row.email);
  const notes = asString(row.notes);

  if (dryRun) {
    return { created: 0, updated: 0, skipped: 0, duplicate: false };
  }

  const existing = await db.customer.findFirst({
    where: {
      OR: [...(email ? [{ email }] : []), ...(phone ? [{ phone }] : [])],
    },
  });

  if (existing) {
    await db.customer.update({ where: { id: existing.id }, data: { fullName, phone, email, notes } });
    return { created: 0, updated: 1, skipped: 0, duplicate: true };
  }

  await db.customer.create({ data: { fullName, phone, email, notes } });
  return { created: 1, updated: 0, skipped: 0, duplicate: false };
}

async function upsertLeadFromRow(row: GenericRow, dryRun: boolean) {
  const source = asString(row.source) ?? "import";
  const title = asString(row.title) ?? asString(row.subject) ?? "Imported Lead";
  const description = asString(row.description);
  const externalSourceId = asString(row.externalSourceId) ?? asString(row.externalId);

  if (dryRun) {
    return { created: 0, updated: 0, skipped: 0, duplicate: false };
  }

  let existing = null;
  if (externalSourceId) {
    existing = await db.lead.findFirst({ where: { source, externalSourceId } });
  }

  if (existing) {
    await db.lead.update({ where: { id: existing.id }, data: { title, description } });
    return { created: 0, updated: 1, skipped: 0, duplicate: true };
  }

  await db.lead.create({ data: { source, title, description, externalSourceId } });
  return { created: 1, updated: 0, skipped: 0, duplicate: false };
}

async function upsertOrderFromRow(row: GenericRow, dryRun: boolean) {
  const orderNumber = asString(row.orderNumber) ?? asString(row.externalOrderId);
  const total = asNumber(row.total) ?? 0;

  if (!orderNumber) {
    return { created: 0, updated: 0, skipped: 1, duplicate: false };
  }

  if (dryRun) {
    return { created: 0, updated: 0, skipped: 0, duplicate: false };
  }

  const fallbackCustomer = await db.customer.findFirst({ orderBy: { createdAt: "asc" } });
  if (!fallbackCustomer) {
    return { created: 0, updated: 0, skipped: 1, duplicate: false };
  }

  const existing = await db.order.findUnique({ where: { orderNumber } });
  if (existing) {
    await db.order.update({
      where: { id: existing.id },
      data: { total, subtotal: total, balanceDue: total },
    });
    return { created: 0, updated: 1, skipped: 0, duplicate: true };
  }

  await db.order.create({
    data: { orderNumber, customerId: fallbackCustomer.id, subtotal: total, total, balanceDue: total },
  });

  return { created: 1, updated: 0, skipped: 0, duplicate: false };
}

export function parseCommitImportInput(input: unknown) {
  return commitImportSchema.parse(input);
}

export async function commitStagedImport(input: z.infer<typeof commitImportSchema>) {
  const syncLog = await db.syncLog.findUniqueOrThrow({ where: { id: input.syncLogId } });
  const payload = (syncLog.errorDetailsJson as { mappingProfile?: MappingProfile } | null) ?? null;
  const mappingProfile = payload?.mappingProfile ?? null;

  const importRows = await db.importRow.findMany({
    where: { syncLogId: syncLog.id },
    orderBy: { rowIndex: "asc" },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let duplicates = 0;

  for (const importRow of importRows) {
    const mapped = applyMapping(importRow.rawJson as GenericRow, mappingProfile);
    const dedupeKey = buildDedupeKey(syncLog.entityType, mapped);

    const result =
      syncLog.entityType === "customer"
        ? await upsertCustomerFromRow(mapped, input.dryRun)
        : syncLog.entityType === "lead"
          ? await upsertLeadFromRow(mapped, input.dryRun)
          : await upsertOrderFromRow(mapped, input.dryRun);

    created += result.created;
    updated += result.updated;
    skipped += result.skipped;
    duplicates += result.duplicate ? 1 : 0;

    if (!input.dryRun) {
      await db.importRow.update({
        where: { id: importRow.id },
        data: {
          mappedJson: mapped,
          dedupeKey,
          status: result.skipped ? "skipped" : result.duplicate ? "duplicate" : "committed",
          errorMessage: result.skipped ? "Skipped due to missing required fields" : null,
        },
      });
    }
  }

  if (!input.dryRun) {
    await db.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "committed",
        endedAt: new Date(),
        recordsProcessed: importRows.length,
        recordsFailed: skipped,
        errorDetailsJson: {
          ...(payload ?? {}),
          commitSummary: { created, updated, skipped, duplicates },
        },
      },
    });
  }

  return {
    syncLogId: syncLog.id,
    entityType: syncLog.entityType,
    dryRun: input.dryRun,
    processed: importRows.length,
    created,
    updated,
    skipped,
    duplicates,
  };
}
