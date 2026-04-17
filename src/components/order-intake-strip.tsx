"use client";

import Link from "next/link";
import { useState } from "react";

const shopFetch: RequestInit = { credentials: "include" };

type Props = {
  orderId: string;
  orderNumber: string;
  status: string;
};

export function OrderIntakeStrip({ orderId, orderNumber, status }: Props) {
  const [note, setNote] = useState<string | null>(null);
  const isInquiryDraft = orderNumber.startsWith("INQ-") && status === "NEW";

  async function copyClientEditLink() {
    try {
      const response = await fetch(`/api/orders/${orderId}/public-order-link`, shopFetch);
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not generate link");
      }
      await navigator.clipboard.writeText(String(json.data.url));
      setNote("Client full-order link copied. Send it in email or text.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not copy link");
    }
  }

  return (
    <section className="minimal-panel mt-3 border-l-4 border-[var(--primary)]">
      <h2 className="text-base font-semibold">Intake &amp; client forms</h2>
      <p className="minimal-muted mt-1 text-sm">
        Copy shareable links (inquiry, quick spec, blank full order) from the{" "}
        <Link className="font-medium text-[var(--primary)] underline" href="/intake">
          Intake
        </Link>{" "}
        page. For <strong>this order</strong>, use the button below so the client opens the prefilled full order form.
      </p>
      {isInquiryDraft ? (
        <p className="minimal-muted mt-2 rounded-md border border-[var(--border)] px-3 py-2 text-sm">
          This looks like an <strong>inquiry draft</strong> (placeholder line item). Send the client the full order link
          so they can enter quantities, pricing, and address.
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="app-button text-sm" onClick={() => void copyClientEditLink()} type="button">
          Copy client full-order link
        </button>
        <Link className="app-button inline-flex text-sm no-underline" href="/intake">
          Open Intake hub
        </Link>
      </div>
      {note ? <p className="minimal-muted mt-2 text-xs">{note}</p> : null}
    </section>
  );
}
