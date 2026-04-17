import { Suspense } from "react";

import { PublicOrderForm } from "@/components/public-order-form";

export default function PreviewOrderFormPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-3xl py-6 text-sm">Loading order form preview…</main>}>
      <PublicOrderForm mode="hub" />
    </Suspense>
  );
}
