import { z } from "zod";

import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/prisma-json";

const mappingProfileSchema = z.object({
  key: z.string().min(2),
  fieldMap: z.record(z.string()).default({}),
  notes: z.string().optional(),
});

export function parseMappingProfile(input: unknown) {
  return mappingProfileSchema.parse(input);
}

export async function upsertMappingProfile(input: z.infer<typeof mappingProfileSchema>, actorUserId?: string) {
  const valueJson = toPrismaJson({
    fieldMap: input.fieldMap,
    notes: input.notes ?? null,
  });

  const existing = await db.setting.findFirst({
    where: {
      scopeType: "import_mapping_profile",
      scopeId: null,
      key: input.key,
    },
  });

  if (existing) {
    return db.setting.update({
      where: { id: existing.id },
      data: {
        valueJson,
        updatedBy: actorUserId,
        updatedAt: new Date(),
      },
    });
  }

  return db.setting.create({
    data: {
      scopeType: "import_mapping_profile",
      scopeId: null,
      key: input.key,
      valueJson,
      updatedBy: actorUserId,
    },
  });
}

export async function listMappingProfiles() {
  return db.setting.findMany({
    where: { scopeType: "import_mapping_profile" },
    orderBy: { updatedAt: "desc" },
  });
}
