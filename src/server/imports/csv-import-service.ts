import { z } from "zod";

import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/prisma-json";

const csvImportSchema = z.object({
  source: z.string().min(2),
  entityType: z.enum(["lead", "customer", "order"]),
  rows: z.array(z.record(z.unknown())).min(1),
  mappingProfileKey: z.string().optional(),
});

export type CsvImportInput = z.infer<typeof csvImportSchema>;

export function parseCsvImport(input: unknown) {
  return csvImportSchema.parse(input);
}

export async function stageCsvImport(input: CsvImportInput) {
  const integration = await db.integration.upsert({
    where: {
      provider_accountLabel: {
        provider: "import",
        accountLabel: input.source,
      },
    },
    create: {
      provider: "import",
      accountLabel: input.source,
      status: "active",
    },
    update: {
      status: "active",
      lastSyncAt: new Date(),
      lastError: null,
    },
  });

  const mappingProfile = input.mappingProfileKey
    ? await db.setting.findFirst({
        where: {
          scopeType: "import_mapping_profile",
          key: input.mappingProfileKey,
        },
      })
    : null;

  const sync = await db.syncLog.create({
    data: {
      integrationId: integration.id,
      syncType: "csv_json_stage",
      direction: "inbound",
      entityType: input.entityType,
      status: "staged",
      startedAt: new Date(),
      endedAt: new Date(),
      recordsProcessed: input.rows.length,
      recordsFailed: 0,
      errorDetailsJson: toPrismaJson({
        source: input.source,
        mappingProfileKey: input.mappingProfileKey ?? null,
        mappingProfile: mappingProfile?.valueJson ?? null,
        previewRows: input.rows.slice(0, 10),
      }),
    },
  });

  await db.importRow.createMany({
    data: input.rows.map((row, index) => ({
      syncLogId: sync.id,
      rowIndex: index,
      rawJson: toPrismaJson(row),
      status: "staged",
    })),
  });

  return {
    syncLogId: sync.id,
    stagedRows: input.rows.length,
  };
}
