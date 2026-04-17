"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type RequestItem = {
  itemType: string;
  quantity: number;
  color: string;
  material: string;
};

type RequestForm = {
  fullName: string;
  phone: string;
  email: string;
  preferredContactChannel: "messenger" | "text" | "email";
  items: RequestItem[];
  budget: number;
  dueDate: string;
  notes: string;
  website: string;
  startedAt: number;
};

function initialForm(): RequestForm {
  return {
    fullName: "",
    phone: "",
    email: "",
    preferredContactChannel: "messenger",
    items: [{ itemType: "", quantity: 1, color: "", material: "" }],
    budget: 0,
    dueDate: "",
    notes: "",
    website: "",
    startedAt: Date.now(),
  };
}

export default function ClientPrintRequestPage() {
  const router = useRouter();
  const [form, setForm] = useState<RequestForm>(initialForm());
  const [message, setMessage] = useState("Fill out the request form and submit.");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("Submitting request...");

    try {
      const response = await fetch("/api/public/print-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          dueDate: form.dueDate || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
          items: form.items.map((item) => ({
            itemType: item.itemType,
            quantity: Number(item.quantity),
            color: item.color || undefined,
            material: item.material || undefined,
          })),
          notes: form.notes || undefined,
          budget: form.budget || undefined,
        }),
      });
      const json = await response.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Request submission failed");
      }
      setMessage("Request submitted. Redirecting...");
      setForm(initialForm());
      router.push("/request/success");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Request submission failed");
    } finally {
      setLoading(false);
    }
  }

  function updateItem(index: number, patch: Partial<RequestItem>) {
    setForm((prev) => {
      const next = [...prev.items];
      next[index] = { ...next[index], ...patch };
      return { ...prev, items: next };
    });
  }

  function addItem() {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { itemType: "", quantity: 1, color: "", material: "" }],
    }));
  }

  function removeItem(index: number) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function copyShareLink() {
    const url = `${window.location.origin}/request`;
    await navigator.clipboard.writeText(url);
    setMessage("Request form link copied.");
  }

  return (
    <main className="mx-auto max-w-3xl py-2 md:py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Request a custom print</h1>
          <p className="minimal-muted mt-1 text-sm">Tell us what you need — we will follow up with a quote.</p>
        </div>
        <button className="app-button shrink-0 self-start sm:self-auto" onClick={copyShareLink} type="button">
          Copy link to share
        </button>
      </div>

      <p className="minimal-panel mt-4 text-sm">{message}</p>

      <form className="minimal-panel mt-4 grid gap-3" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Full Name
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              required
              value={form.fullName}
              onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            Preferred Contact
            <select
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.preferredContactChannel}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  preferredContactChannel: event.target.value as RequestForm["preferredContactChannel"],
                }))
              }
            >
              <option value="messenger">Messenger</option>
              <option value="text">Text</option>
              <option value="email">Email</option>
            </select>
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Phone
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            Email
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Due Date
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((prev) => ({ ...prev, dueDate: event.target.value }))}
            />
          </label>
          <label className="text-sm">
            Budget
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              min={0}
              step="0.01"
              type="number"
              value={form.budget}
              onChange={(event) => setForm((prev) => ({ ...prev, budget: Number(event.target.value) }))}
            />
          </label>
        </div>

        <div className="grid gap-2">
          <h2 className="text-base font-semibold">Items Requested</h2>
          {form.items.map((item, index) => (
            <article className="rounded-md border border-[var(--border)] p-2" key={index}>
              <div className="grid gap-2 md:grid-cols-4">
                <input
                  className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                  placeholder="Item type"
                  required
                  value={item.itemType}
                  onChange={(event) => updateItem(index, { itemType: event.target.value })}
                />
                <input
                  className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                  min={1}
                  placeholder="Qty"
                  required
                  type="number"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                />
                <input
                  className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                  placeholder="Material"
                  value={item.material}
                  onChange={(event) => updateItem(index, { material: event.target.value })}
                />
                <input
                  className="rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                  placeholder="Color"
                  value={item.color}
                  onChange={(event) => updateItem(index, { color: event.target.value })}
                />
              </div>
              {form.items.length > 1 ? (
                <button className="app-button mt-2 text-xs" onClick={() => removeItem(index)} type="button">
                  Remove Item
                </button>
              ) : null}
            </article>
          ))}
          <button className="app-button" onClick={addItem} type="button">
            Add Another Item
          </button>
        </div>

        <label className="text-sm">
          Notes / Details
          <textarea
            className="mt-1 min-h-24 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
          />
        </label>
        <input
          className="hidden"
          value={form.website}
          onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
          tabIndex={-1}
        />

        <button className="minimal-cta" disabled={loading} type="submit">
          {loading ? "Submitting..." : "Submit Print Request"}
        </button>
      </form>
    </main>
  );
}
