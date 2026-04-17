import { z } from "zod";

import { db } from "@/lib/db";

const mappingProfileSchema = z.object({
  key: z.string().min(2),
  fieldMap: z.record(z.string()).default({}),
  notes: z.string().optional(),
});

export function parseMappingProfile(input: unknown) {
  return mappingProfileSchema.parse(input);
}

export async function upsertMappingProfile(input: z.infer<typeof mappingProfileSchema>, actorUserId?: string) {
  return db.setting.upsert({
    where: {
      scopeType_scopeId_key: {
        scopeType: "import_mapping_profile",
        scopeId: null,
        key: input.key,
      },
    },
    create: {
      scopeType: "import_mapping_profile",
      scopeId: null,
      key: input.key,
      valueJson: {
        fieldMap: input.fieldMap,
        notes: input.notes ?? null,
      },
      updatedBy: actorUserId,
    },
    update: {
      valueJson: {
        fieldMap: input.fieldMap,
        notes: input.notes ?? null,
      },
      updatedBy: actorUserId,
      updatedAt: new Date(),
    },
  });
}

export async function listMappingProfiles() {
  return db.setting.findMany({
    where: { scopeType: "import_mapping_profile" },
    orderBy: { updatedAt: "desc" },
  });
}
