"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const PUBLIC_PATH = "/public/print-request";
const HUB_SUCCESS = "/intake/print-spec-success";
const PUBLIC_SUCCESS = "/public/print-request/success";

export type PrintSpecFormMode = "hub" | "public";

type Line = { itemType: string; quantity: number; material: string; color: string };

type Props = { mode: PrintSpecFormMode };

function emptyLine(): Line {
  return { itemType: "", quantity: 1, material: "", color: "" };
}

export function PrintSpecForm({ mode }: Props) {
  const router = useRouter();
  const isHub = mode === "hub";
  const successPath = isHub ? HUB_SUCCESS : PUBLIC_SUCCESS;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactChannel, setPreferredContactChannel] = useState<"messenger" | "text" | "email">("email");
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [budget, setBudget] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [note, setNote] = useState("Add at least one line item with type and quantity.");
  const [loading, setLoading] = useState(false);

  async function copyClientLink() {
    const url = `${window.location.origin}${PUBLIC_PATH}`;
    await navigator.clipboard.writeText(url);
    setNote("Quick spec link copied.");
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setNote("Enter an email or a phone number.");
      return;
    }
    if (phone.trim() && phone.trim().length < 7) {
      setNote("Phone must be at least 7 characters if provided.");
      return;
    }
    const items = lines
      .filter((l) => l.itemType.trim().length >= 2)
      .map((l) => ({
        itemType: l.itemType.trim(),
        quantity: l.quantity,
        material: l.material.trim() || undefined,
        color: l.color.trim() || undefined,
      }));
    if (items.length < 1) {
      setNote("Add at least one item with a type (2+ characters) and quantity.");
      return;
    }
    setLoading(true);
    setNote("Sending…");
    try {
      const res = await fetch("/api/public/print-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          preferredContactChannel,
          items,
          budget: budget.trim() ? Number(budget) : undefined,
          dueDate: dueDate || undefined,
          notes: notes.trim() || undefined,
          website,
          startedAt,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Submit failed");
      }
      setNote("Sent. Redirecting…");
      router.push(successPath);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl py-2 md:py-4">
      <div className={isHub ? "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" : ""}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Quick item spec</h1>
          <p className="minimal-muted mt-1 text-sm">
            Structured list for people who already know parts and quantities. For a conversational first message, use the
            inquiry form instead.
          </p>
        </div>
        {isHub ? (
          <button className="app-button shrink-0 self-start sm:self-auto" onClick={() => void copyClientLink()} type="button">
            Copy client link
          </button>
        ) : null}
      </div>

      <p className="minimal-panel mt-4 text-sm">{note}</p>

      <form className="minimal-panel mt-4 grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm">
          Full name
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
          Preferred contact
          <select
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={preferredContactChannel}
            onChange={(e) => setPreferredContactChannel(e.target.value as "messenger" | "text" | "email")}
          >
            <option value="email">Email</option>
            <option value="text">Text</option>
            <option value="messenger">Messenger</option>
          </select>
        </label>

        <div className="grid gap-2">
          <p className="text-sm font-medium">Line items</p>
          {lines.map((line, index) => (
            <div className="grid gap-2 rounded-md border border-[var(--border)] p-3 md:grid-cols-4" key={index}>
              <label className="text-sm md:col-span-2">
                Item type
                <input
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                  value={line.itemType}
                  onChange={(e) => updateLine(index, { itemType: e.target.value })}
                  placeholder="e.g. coaster set"
                />
              </label>
              <label className="text-sm">
                Qty
                <input
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                />
              </label>
              <label className="text-sm">
                Material
                <input
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                  value={line.material}
                  onChange={(e) => updateLine(index, { material: e.target.value })}
                />
              </label>
              <label className="text-sm md:col-span-2">
                Color
                <input
                  className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
                  value={line.color}
                  onChange={(e) => updateLine(index, { color: e.target.value })}
                />
              </label>
            </div>
          ))}
          <button
            className="app-button justify-self-start"
            onClick={() => setLines((p) => [...p, emptyLine()])}
            type="button"
          >
            Add row
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Budget (optional)
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              type="number"
              min={0}
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Due date (optional)
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
        <label className="text-sm">
          Notes (optional)
          <textarea
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>

        <label className="sr-only" htmlFor="print-spec-website">
          Website
        </label>
        <input
          autoComplete="off"
          className="hidden"
          id="print-spec-website"
          name="website"
          tabIndex={-1}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <button className="minimal-cta" disabled={loading} type="submit">
          {loading ? "Sending…" : "Submit spec"}
        </button>
      </form>
    </main>
  );
}
