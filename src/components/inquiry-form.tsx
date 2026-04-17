"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const PUBLIC_INQUIRY_PATH = "/public/inquiry";
const HUB_SUCCESS = "/intake/inquiry-success";
const PUBLIC_SUCCESS = "/public/inquiry/success";

/** `hub` = app-side preview with copy-link; `public` = shareable client URL. */
export type InquiryFormMode = "hub" | "public";

type Props = { mode: InquiryFormMode };

export function InquiryForm({ mode }: Props) {
  const router = useRouter();
  const isHub = mode === "hub";
  const successPath = isHub ? HUB_SUCCESS : PUBLIC_SUCCESS;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactChannel, setPreferredContactChannel] = useState<"messenger" | "text" | "email">("email");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [budget, setBudget] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [website, setWebsite] = useState("");
  const [startedAt] = useState(() => Date.now());
  const [note, setNote] = useState("Tell us what you are looking for — we will follow up.");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setNote("Enter an email or a phone number so we can reach you.");
      return;
    }
    setLoading(true);
    setNote("Sending…");
    try {
      const res = await fetch("/api/public/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          preferredContactChannel,
          subject: subject.trim(),
          message: message.trim(),
          budget: budget.trim() ? Number(budget) : undefined,
          dueDate: dueDate || undefined,
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

  async function copyInquiryLink() {
    const url = `${window.location.origin}${PUBLIC_INQUIRY_PATH}`;
    await navigator.clipboard.writeText(url);
    setNote("Inquiry link copied (initial contact, no line-item pricing).");
  }

  return (
    <main className="mx-auto max-w-2xl py-2 md:py-4">
      <div className={isHub ? "flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between" : ""}>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Inquiry</h1>
          <p className="minimal-muted mt-1 text-sm">
            First step: describe your project. For quotes with line items and pricing, your shop will send the full
            order form after you are ready.
          </p>
        </div>
        {isHub ? (
          <button className="app-button shrink-0 self-start sm:self-auto" onClick={copyInquiryLink} type="button">
            Copy inquiry link
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
            onChange={(e) => setPreferredContactChannel(e.target.value as typeof preferredContactChannel)}
          >
            <option value="email">Email</option>
            <option value="text">Text</option>
            <option value="messenger">Messenger</option>
          </select>
        </label>
        <label className="text-sm">
          Subject
          <input
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>
        <label className="text-sm">
          Message (what do you need?)
          <textarea
            className="mt-1 min-h-32 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            required
            minLength={10}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            Target budget (optional)
            <div className="mt-1 flex items-center rounded-md border border-[var(--border)] bg-[var(--panel)]">
              <span className="pl-3 text-sm text-[var(--muted-foreground)]">$</span>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none"
                min={0}
                step="0.01"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </label>
          <label className="text-sm">
            Needed by (optional)
            <input
              className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
        <input
          className="hidden"
          tabIndex={-1}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
        <button className="minimal-cta" disabled={loading} type="submit">
          {loading ? "Sending…" : "Send inquiry"}
        </button>
      </form>
    </main>
  );
}
