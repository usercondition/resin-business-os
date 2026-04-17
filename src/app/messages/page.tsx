"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type EmailMessage = {
  id: string;
  customerId: string;
  direction: string;
  messageText: string;
  createdAt: string;
  customer: { fullName: string; email?: string | null };
};

const ACTOR_HEADERS = {
  "Content-Type": "application/json",
  "x-user-id": "smoke-admin-1",
  "x-user-role": "ADMIN",
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [search, setSearch] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string>("");
  const [replySubject, setReplySubject] = useState("Re: Print Request");
  const [replyBody, setReplyBody] = useState("");
  const [forwardTo, setForwardTo] = useState("");
  const [forwardSubject, setForwardSubject] = useState("Fwd: Print Request");
  const [forwardBody, setForwardBody] = useState("");
  const [message, setMessage] = useState("Loading messages...");

  const selectedMessage = useMemo(
    () => messages.find((msg) => msg.id === selectedMessageId) ?? null,
    [messages, selectedMessageId],
  );

  const loadMessages = useCallback(async () => {
    const response = await fetch(`/api/messages/email?page=1&pageSize=50&search=${encodeURIComponent(search)}`, {
      headers: ACTOR_HEADERS,
    });
    const json = await response.json();
    if (json.ok) {
      setMessages(json.data.items ?? []);
      if (!selectedMessageId && (json.data.items ?? []).length > 0) {
        setSelectedMessageId(json.data.items[0].id);
      }
      setMessage("Messages loaded");
    } else {
      setMessage(`Failed loading messages: ${json.error?.message ?? "unknown"}`);
    }
  }, [search, selectedMessageId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  async function submitReply(event: FormEvent) {
    event.preventDefault();
    if (!selectedMessage) return;

    const response = await fetch("/api/messages/email/reply", {
      method: "POST",
      headers: ACTOR_HEADERS,
      body: JSON.stringify({
        customerId: selectedMessage.customerId,
        inReplyToMessageId: selectedMessage.id,
        subject: replySubject,
        body: replyBody,
      }),
    });
    const json = await response.json();
    setMessage(json.ok ? "Reply queued" : `Reply failed: ${json.error?.message ?? "unknown"}`);
    if (json.ok) {
      setReplyBody("");
      await loadMessages();
    }
  }

  async function submitForward(event: FormEvent) {
    event.preventDefault();
    if (!selectedMessage) return;

    const response = await fetch("/api/messages/email/forward", {
      method: "POST",
      headers: ACTOR_HEADERS,
      body: JSON.stringify({
        customerId: selectedMessage.customerId,
        sourceMessageId: selectedMessage.id,
        toEmail: forwardTo,
        subject: forwardSubject,
        body: forwardBody,
      }),
    });
    const json = await response.json();
    setMessage(json.ok ? "Forward queued" : `Forward failed: ${json.error?.message ?? "unknown"}`);
    if (json.ok) {
      setForwardBody("");
      await loadMessages();
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-4">
      <h1 className="text-xl font-semibold">Email Message Center</h1>
      <p className="minimal-muted mt-1 text-sm">
        Inbound mail is created via n8n → <code className="text-xs">/api/webhooks/email/inbound</code>. Outbound reply
        / forward posts to <code className="text-xs">N8N_EMAIL_OUTBOUND_WEBHOOK_URL</code>. Import the JSON templates
        under <code className="text-xs">docs/</code> (inbound + outbound). Customers need an email on file to reply
        from the app.
      </p>
      <p className="minimal-panel mt-3 text-sm">{message}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <section className="minimal-panel lg:col-span-1">
          <div className="flex gap-2">
            <input
              className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              placeholder="Search messages"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button className="app-button" onClick={() => void loadMessages()} type="button">
              Search
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {messages.map((msg) => (
              <button
                className={`rounded-md border px-3 py-2 text-left text-sm ${
                  selectedMessageId === msg.id ? "border-[var(--primary)]" : "border-[var(--border)]"
                }`}
                key={msg.id}
                onClick={() => setSelectedMessageId(msg.id)}
                type="button"
              >
                <p className="font-semibold">{msg.customer.fullName}</p>
                <p className="minimal-muted text-xs">{msg.direction} - {new Date(msg.createdAt).toLocaleString()}</p>
                <p className="minimal-muted mt-1 line-clamp-2 text-xs">{msg.messageText}</p>
              </button>
            ))}
          </div>
        </section>

        <section className="minimal-panel lg:col-span-2">
          <h2 className="text-base font-semibold">Selected Message</h2>
          {selectedMessage ? (
            <>
              <p className="minimal-muted mt-1 text-sm">
                {selectedMessage.customer.fullName} ({selectedMessage.customer.email ?? "No email"})
              </p>
              <pre className="mt-2 max-h-44 overflow-auto rounded-md border border-[var(--border)] p-3 text-xs">
                {selectedMessage.messageText}
              </pre>
              {!selectedMessage.customer.email ? (
                <p className="mt-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                  This customer has no email on file. Add an email on the customer record before reply-to-customer
                  flows will work in n8n/Gmail.
                </p>
              ) : null}

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <form className="grid gap-2" onSubmit={submitReply}>
                  <h3 className="text-sm font-semibold">Reply</h3>
                  <input
                    className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    value={replySubject}
                    onChange={(event) => setReplySubject(event.target.value)}
                    required
                  />
                  <textarea
                    className="min-h-24 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    value={replyBody}
                    onChange={(event) => setReplyBody(event.target.value)}
                    required
                  />
                  <button className="minimal-cta" type="submit">Send Reply</button>
                </form>

                <form className="grid gap-2" onSubmit={submitForward}>
                  <h3 className="text-sm font-semibold">Forward</h3>
                  <input
                    className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    placeholder="to@email.com"
                    type="email"
                    value={forwardTo}
                    onChange={(event) => setForwardTo(event.target.value)}
                    required
                  />
                  <input
                    className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    value={forwardSubject}
                    onChange={(event) => setForwardSubject(event.target.value)}
                    required
                  />
                  <textarea
                    className="min-h-24 rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
                    value={forwardBody}
                    onChange={(event) => setForwardBody(event.target.value)}
                    required
                  />
                  <button className="minimal-cta" type="submit">Forward Email</button>
                </form>
              </div>
            </>
          ) : (
            <p className="minimal-muted mt-2 text-sm">No message selected.</p>
          )}
        </section>
      </div>
    </main>
  );
}
