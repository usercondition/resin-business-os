"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { formatUsd } from "@/lib/format-money";

const PUBLIC_ORDER_PATH = "/public/order-form";
const HUB_SUCCESS = "/request/order-form-success";
const PUBLIC_SUCCESS = "/public/order-form/success";

/** `hub` = signed-in app preview with copy-link tools; `public` = client-facing URL. */
export type PublicOrderFormMode = "hub" | "public";

type Line = {
  itemName: string;
  quantity: number;
  unitPrice: number;
  materialType: string;
  color: string;
  printNotes: string;
};

type Props = { mode: PublicOrderFormMode };

function emptyLine(): Line {
  return { itemName: "", quantity: 1, unitPrice: 0, materialType: "", color: "", printNotes: "" };
}

export function PublicOrderForm({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const isHub = mode === "hub";
  const successPath = isHub ? HUB_SUCCESS : PUBLIC_SUCCESS;
  const isEditFlow = mode === "public" && Boolean(token);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactChannel, setPreferredContactChannel] = useState("");
  const [defaultAddress, setDefaultAddress] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [tax, setTax] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [note, setNote] = useState("Complete all line items with pricing so we can process your order.");
  const [loading, setLoading] = useState(false);
  const [prefillLoaded, setPrefillLoaded] = useState(!isEditFlow);

  const subtotal = lines.reduce((s, l) => s + l.quantity * (Number.isFinite(l.unitPrice) ? l.unitPrice : 0), 0);
  const total = subtotal + tax - discount;

  function setLine(i: number, patch: Partial<Line>) {
    setLines((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(i: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));
  }

  async function copyOrderFormLink() {
    await navigator.clipboard.writeText(`${window.location.origin}${PUBLIC_ORDER_PATH}`);
    setNote("Full order form link copied.");
  }

  useEffect(() => {
    if (!isEditFlow) {
      return;
    }
    let cancelled = false;
    async function loadPrefill() {
      setNote("Loading your order details…");
      const res = await fetch(`/api/public/order-submit?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Could not load this order link.");
      }
      if (cancelled) {
        return;
      }
      setFullName(json.data.customer.fullName ?? "");
      setPhone(json.data.customer.phone ?? "");
      setEmail(json.data.customer.email ?? "");
      setPreferredContactChannel(json.data.customer.preferredContactChannel ?? "");
      setDefaultAddress(json.data.customer.defaultAddress ?? "");
      setCustomerNotes(json.data.customer.notes ?? "");
      setDueDate(json.data.order.dueDate ?? "");
      setOrderNotes(json.data.order.notes ?? "");
      setTax(Number(json.data.order.tax ?? 0));
      setDiscount(Number(json.data.order.discount ?? 0));
      setLines(
        (json.data.order.items ?? []).length > 0
          ? json.data.order.items.map((i: {
              itemName: string;
              quantity: number;
              unitPrice: number;
              materialType?: string;
              color?: string;
              printNotes?: string;
            }) => ({
              itemName: i.itemName ?? "",
              quantity: Number(i.quantity ?? 1),
              unitPrice: Number(i.unitPrice ?? 0),
              materialType: i.materialType ?? "",
              color: i.color ?? "",
              printNotes: i.printNotes ?? "",
            }))
          : [emptyLine()],
      );
      setPrefillLoaded(true);
      setNote("Review and adjust line items before submitting.");
    }
    void loadPrefill().catch((err) => {
      if (cancelled) {
        return;
      }
      setNote(err instanceof Error ? err.message : "Could not load this order link.");
      setPrefillLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isEditFlow, token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setNote("Enter an email or a phone number on the customer section.");
      return;
    }
    setLoading(true);
    setNote("Submitting…");
    try {
      const items = lines.map((l) => ({
        itemName: l.itemName.trim(),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        materialType: l.materialType.trim() || undefined,
        color: l.color.trim() || undefined,
        ...(l.printNotes.trim()
          ? { printSpec: { notes: l.printNotes.trim() } as Record<string, unknown> }
          : {}),
      }));

      const endpoint = "/api/public/order-submit";
      const method = isEditFlow ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newCustomer: {
            fullName: fullName.trim(),
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            preferredContactChannel: preferredContactChannel.trim() || undefined,
            defaultAddress: defaultAddress.trim() || undefined,
            notes: customerNotes.trim() || undefined,
            tags: ["public_order_form"],
          },
          dueDate: dueDate || undefined,
          notes: orderNotes.trim() || undefined,
          tax: Number(tax),
          discount: Number(discount),
          items,
          ...(isEditFlow ? { token } : {}),
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Submit failed");
      }
      setNote(
        isEditFlow
          ? `Order ${json.data.orderNumber} updated. Redirecting…`
          : `Order ${json.data.orderNumber} created. Redirecting…`,
      );
      router.push(successPath);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl py-2 md:py-4">
      <div className={isHub ? "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" : ""}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{isEditFlow ? "Review your order" : "Order form"}</h1>
          <p className="minimal-muted mt-1 text-sm">
            {isEditFlow
              ? "This link is tied to your inquiry draft. You can edit line items and quantities before final confirmation."
              : "Use this after you are ready to place an order: billing contact, shipping address, each line item with unit price, materials, and build notes."}
          </p>
        </div>
        {isHub ? (
          <button className="app-button shrink-0 self-start sm:self-auto" onClick={copyOrderFormLink} type="button">
            Copy full order form link
          </button>
        ) : null}
      </div>

      <p className="minimal-panel mt-4 text-sm">{note}</p>

      <div className="minimal-panel mt-4 text-sm">
        <p className="font-semibold">Order totals (preview)</p>
        <p className="minimal-muted mt-1">
          Subtotal {formatUsd(subtotal)} · Tax {formatUsd(tax)} · Discount {formatUsd(discount)} ·{" "}
          <span className="font-semibold text-[var(--text)]">Total {formatUsd(total)}</span>
        </p>
      </div>

      {!prefillLoaded ? (
        <div className="minimal-panel mt-4 text-sm">Loading form data…</div>
      ) : (
        <form className="minimal-panel mt-4 grid gap-4" onSubmit={onSubmit}>
        <h2 className="text-base font-semibold">Customer & shipping</h2>
        <label className="text-sm">
          Full name (as it should appear on the order)
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Email
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Phone
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        </div>
        <label className="text-sm">
          Preferred contact (optional)
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            placeholder="email, text, messenger handle…"
            value={preferredContactChannel}
            onChange={(e) => setPreferredContactChannel(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Shipping / billing address
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            placeholder="Street, city, state, ZIP"
            value={defaultAddress}
            onChange={(e) => setDefaultAddress(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Customer notes (optional)
          <textarea
            className="mt-1 min-h-16 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
          />
        </label>

        <h2 className="text-base font-semibold">Order details</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            Due date (optional)
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Tax ($)
            <div className="mt-1 flex items-center rounded-md border border-[var(--border)] bg-[var(--panel)]">
              <span className="pl-3 text-sm text-[var(--muted)]">$</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none"
                min={0}
                step="0.01"
                type="number"
                value={tax}
                onChange={(e) => setTax(Number(e.target.value))}
              />
            </div>
          </label>
          <label className="text-sm">
            Discount ($)
            <div className="mt-1 flex items-center rounded-md border border-[var(--border)] bg-[var(--panel)]">
              <span className="pl-3 text-sm text-[var(--muted)]">$</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none"
                min={0}
                step="0.01"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
              />
            </div>
          </label>
        </div>
        <label className="text-sm">
          Order notes (optional)
          <textarea
            className="mt-1 min-h-20 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
          />
        </label>

        <h2 className="text-base font-semibold">Line items</h2>
        <div className="grid gap-3">
          {lines.map((line, index) => (
            <article className="rounded-md border border-[var(--border)] p-3" key={index}>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="text-sm md:col-span-2">
                  Item / service name
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                    required
                    value={line.itemName}
                    onChange={(e) => setLine(index, { itemName: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  Quantity
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                    min={1}
                    required
                    type="number"
                    value={line.quantity}
                    onChange={(e) => setLine(index, { quantity: Number(e.target.value) })}
                  />
                </label>
                <label className="text-sm">
                  Unit price ($)
                  <div className="mt-1 flex items-center rounded-md border border-[var(--border)] bg-[var(--panel)]">
                    <span className="pl-2 text-sm text-[var(--muted)]">$</span>
                    <input
                      className="min-w-0 flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none"
                      min={0}
                      required
                      step="0.01"
                      type="number"
                      value={line.unitPrice}
                      onChange={(e) => setLine(index, { unitPrice: Number(e.target.value) })}
                    />
                  </div>
                </label>
                <p className="text-xs text-[var(--muted)] md:col-span-2">
                  Line total: {formatUsd(line.quantity * line.unitPrice)}
                </p>
                <label className="text-sm">
                  Material
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                    value={line.materialType}
                    onChange={(e) => setLine(index, { materialType: e.target.value })}
                  />
                </label>
                <label className="text-sm">
                  Color
                  <input
                    className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                    value={line.color}
                    onChange={(e) => setLine(index, { color: e.target.value })}
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  Print / build notes (optional)
                  <textarea
                    className="mt-1 min-h-16 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                    placeholder="Layer height, orientation, tolerances, file links you have been given…"
                    value={line.printNotes}
                    onChange={(e) => setLine(index, { printNotes: e.target.value })}
                  />
                </label>
              </div>
              {lines.length > 1 ? (
                <button className="app-button mt-2 text-xs" onClick={() => removeLine(index)} type="button">
                  Remove line
                </button>
              ) : null}
            </article>
          ))}
        </div>
        <button className="app-button w-fit" onClick={addLine} type="button">
          Add line item
        </button>

          <button className="minimal-cta" disabled={loading} type="submit">
            {loading ? "Submitting…" : isEditFlow ? "Submit updated order" : "Submit order"}
          </button>
        </form>
      )}
    </main>
  );
}
