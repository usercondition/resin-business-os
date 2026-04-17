import { Suspense } from "react";

import { PublicOrderForm } from "@/components/public-order-form";

export default function PublicOrderFormPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl py-6 text-sm">Loading order form…</main>}>
      <PublicOrderForm mode="public" />
    </Suspense>
  );
}
