"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const ACTOR_HEADERS = {
  "x-user-id": "smoke-admin-1",
  "x-user-role": "ADMIN",
};

type Feed = {
  messages: Array<{ id: string; body: string; author: string; staffName: string | null; createdAt: string }>;
  photos: Array<{
    id: string;
    caption: string | null;
    visibleToClient: boolean;
    dataUrl: string;
    createdAt: string;
  }>;
};

type Props = {
  orderId: string;
  portalUrl: string;
};

export function OrderPortalPanel({ orderId, portalUrl }: Props) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [note, setNote] = useState("Loading portal…");
  const [shopReply, setShopReply] = useState("");
  const [caption, setCaption] = useState("");
  const [visibleToClient, setVisibleToClient] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/orders/${orderId}/portal`, { headers: ACTOR_HEADERS });
    const json = await res.json();
    if (!json.ok) {
      setNote(json.error?.message ?? "Failed to load portal");
      return;
    }
    setFeed(json.data);
    setNote("Portal loaded — share the link below; customers sign in with their name + order number.");
  }, [orderId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyPortalLink() {
    await navigator.clipboard.writeText(portalUrl);
    setNote("Portal link copied.");
  }

  async function sendShopMessage(e: FormEvent) {
    e.preventDefault();
    const body = shopReply.trim();
    if (!body) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/portal/messages`, {
        method: "POST",
        headers: { ...ACTOR_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Failed");
      }
      setShopReply("");
      await load();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).elements.namedItem("photo") as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      setNote("Choose an image file.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(new Error("Read failed"));
        r.readAsDataURL(file);
      });
      const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!m) {
        throw new Error("Could not read image.");
      }
      const res = await fetch(`/api/orders/${orderId}/portal/photos`, {
        method: "POST",
        headers: { ...ACTOR_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          mimeType: m[1],
          imageBase64: m[2],
          caption: caption.trim() || null,
          visibleToClient,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error?.message ?? "Upload failed");
      }
      setCaption("");
      input.value = "";
      await load();
      setNote("Photo uploaded.");
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="minimal-panel mt-4">
      <h2 className="text-base font-semibold">Client portal</h2>
      <p className="minimal-muted mt-2 text-sm">
        Orders stay tied to the customer on this order. Share the portal link; the client signs in with their{" "}
        <strong>first name</strong>, <strong>last name</strong> (matching the customer name on the order), and this{" "}
        <strong>order number</strong>.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="app-button text-sm" onClick={() => void copyPortalLink()} type="button">
          Copy portal link
        </button>
        <span className="minimal-muted self-center text-xs break-all">{portalUrl}</span>
      </div>
      <p className="minimal-muted mt-2 text-xs">{note}</p>

      {!feed ? null : (
        <>
          <h3 className="mt-4 text-sm font-semibold">Conversation</h3>
          <ul className="mt-2 max-h-56 space-y-2 overflow-y-auto text-sm">
            {feed.messages.map((m) => (
              <li className="rounded-md border border-[var(--border)] px-2 py-1.5" key={m.id}>
                <span className="text-xs text-[var(--muted)]">
                  {m.author === "STAFF" ? m.staffName ?? "You" : "Customer"} · {new Date(m.createdAt).toLocaleString()}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>
          <form className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={sendShopMessage}>
            <label className="min-w-0 flex-1 text-sm">
              Reply to customer
              <textarea
                className="mt-1 min-h-16 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                value={shopReply}
                onChange={(e) => setShopReply(e.target.value)}
              />
            </label>
            <button className="minimal-cta shrink-0 text-sm" disabled={busy} type="submit">
              Send
            </button>
          </form>

          <h3 className="mt-4 text-sm font-semibold">Progress photos</h3>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {feed.photos.map((p) => (
              <li className="rounded-md border border-[var(--border)] p-2 text-xs" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img alt="" className="max-h-36 w-full object-contain" src={p.dataUrl} />
                {p.caption ? <p className="minimal-muted mt-1">{p.caption}</p> : null}
                <p className="minimal-muted mt-1">
                  {p.visibleToClient ? "Visible on portal" : "Internal only"} · {new Date(p.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
          <form className="mt-3 grid gap-2 border-t border-[var(--border)] pt-3" onSubmit={uploadPhoto}>
            <label className="text-sm">
              Add photo (JPEG / PNG / WebP, max ~600KB)
              <input className="mt-1 block text-sm" name="photo" accept="image/jpeg,image/png,image/webp" type="file" />
            </label>
            <label className="text-sm">
              Caption (optional)
              <input
                className="mt-1 w-full rounded-md border border-[var(--border)] bg-transparent px-2 py-1 text-sm"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input checked={visibleToClient} onChange={(e) => setVisibleToClient(e.target.checked)} type="checkbox" />
              Show on customer portal
            </label>
            <button className="app-button w-fit text-sm" disabled={busy} type="submit">
              Upload photo
            </button>
          </form>
        </>
      )}
    </section>
  );
}
