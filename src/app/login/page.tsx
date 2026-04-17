"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") ?? "/dashboard", [searchParams]);
  const errorParam = useMemo(() => searchParams.get("error"), [searchParams]);

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState(
    errorParam === "invalid_token" ? "That sign-in link is invalid or has already been used." : "",
  );
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("Sending link…");
    setDevLink(null);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next: nextPath }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Request failed");
      }
      setMessage(json.data?.message ?? "Check your email.");
      if (typeof json.data?.devSignInUrl === "string") {
        setDevLink(json.data.devSignInUrl);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md py-10">
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="minimal-muted mt-2 text-sm">
        Enter the same work email you configured for this deployment (environment variable{" "}
        <code className="rounded bg-[var(--panel)] px-1">APP_OWNER_EMAIL</code>). You will receive a one-time link valid
        for 15 minutes.
      </p>
      {message ? <p className="minimal-panel minimal-panel-elevated mt-4 text-sm">{message}</p> : null}
      {devLink ? (
        <p className="minimal-muted mt-3 break-all text-xs">
          Development link:{" "}
          <a className="link-terminal underline" href={devLink}>
            {devLink}
          </a>
        </p>
      ) : null}
      <form className="minimal-panel minimal-panel-elevated mt-4 grid gap-3" onSubmit={onSubmit}>
        <label className="text-sm">
          Email
          <input
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            required
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
        </label>
        <button className="minimal-cta" disabled={loading} type="submit">
          {loading ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="minimal-muted px-4 py-8 text-sm">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
