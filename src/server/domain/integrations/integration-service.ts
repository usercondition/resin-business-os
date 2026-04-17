import { db } from "@/lib/db";

export async function upsertIntegration(input: {
  provider: string;
  accountLabel: string;
  status: string;
  webhookUrl?: string;
  configJsonEncryptedRef?: string;
}) {
  return db.integration.upsert({
    where: {
      provider_accountLabel: {
        provider: input.provider,
        accountLabel: input.accountLabel,
      },
    },
    update: {
      status: input.status,
      webhookUrl: input.webhookUrl,
      configJsonEncryptedRef: input.configJsonEncryptedRef,
      lastError: null,
    },
    create: {
      provider: input.provider,
      accountLabel: input.accountLabel,
      status: input.status,
      webhookUrl: input.webhookUrl,
      configJsonEncryptedRef: input.configJsonEncryptedRef,
    },
  });
}
