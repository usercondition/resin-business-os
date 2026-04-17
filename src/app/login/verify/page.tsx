"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function VerifyInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const nextPath = useMemo(() => {
    const n = searchParams.get("next") ?? "/dashboard";
    if (!n.startsWith("/") || n.startsWith("//")) {
      return "/dashboard";
    }
    return n;
  }, [searchParams]);

  const [message, setMessage] = useState("Confirming sign-in…");

  useEffect(() => {
    if (!token || token.length < 32) {
      setMessage("Missing or invalid token.");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token, next: nextPath }),
        });
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.error?.message ?? "Verification failed");
        }
        if (!cancelled) {
          setMessage("Signed in. Redirecting…");
          router.replace(json.data?.redirectTo ?? nextPath);
          router.refresh();
        }
      } catch (e) {
        if (!cancelled) {
          setMessage(e instanceof Error ? e.message : "Verification failed");
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, router, nextPath]);

  return (
    <main className="mx-auto max-w-md py-10">
      <h1 className="text-xl font-semibold tracking-tight">Signing you in</h1>
      <p className="minimal-panel minimal-panel-elevated mt-4 text-sm">{message}</p>
      <p className="minimal-muted mt-3 text-xs">
        If this page stays here, open a fresh magic link from your email (links are single-use).
      </p>
    </main>
  );
}

export default function VerifyMagicLinkPage() {
  return (
    <Suspense fallback={<p className="minimal-muted px-4 py-8 text-sm">Loading…</p>}>
      <VerifyInner />
    </Suspense>
  );
}
