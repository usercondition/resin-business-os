import type { Prisma } from "@prisma/client";

/** Coerce arbitrary values to JSON Prisma accepts for `Json` / `Json?` fields. */
export function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function toPrismaJsonOptional(
  value: unknown | undefined,
): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }
  return toPrismaJson(value);
}
