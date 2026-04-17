"use client";

import { useCallback, useEffect, useState } from "react";

type ImportRow = {
  id: string;
  syncLogId: string;
  rowIndex: number;
  status: string;
  dedupeKey?: string | null;
  rawJson: Record<string, unknown>;
  errorMessage?: string | null;
};

type MappingProfile = {
  id: string;
  key: string;
  valueJson: { fieldMap?: Record<string, string>; notes?: string };
};

const shopFetch: RequestInit = { credentials: "include" };
const shopJsonFetch: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

export default function OpsImportsPage() {
  const [duplicates, setDuplicates] = useState<ImportRow[]>([]);
  const [profiles, setProfiles] = useState<MappingProfile[]>([]);
  const [profileKey, setProfileKey] = useState("facebook-default");
  const [fieldMapJson, setFieldMapJson] = useState('{"fullName":"name","externalSourceId":"listing_id"}');
  const [message, setMessage] = useState("Ready");

  const refreshData = useCallback(async () => {
    const duplicateResp = await fetch("/api/imports/duplicates", shopFetch);
    const duplicateJson = await duplicateResp.json();
    setDuplicates(duplicateJson.data ?? []);

    const profileResp = await fetch("/api/imports/mapping-profiles", shopFetch);
    const profileJson = await profileResp.json();
    setProfiles(profileJson.data ?? []);
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  async function resolveDuplicate(id: string, resolution: "accept_duplicate" | "force_commit" | "skip") {
    const response = await fetch("/api/imports/duplicates", {
      method: "PATCH",
      ...shopJsonFetch,
      body: JSON.stringify({ importRowId: id, resolution }),
    });

    const json = await response.json();
    setMessage(json.ok ? `Resolved duplicate: ${resolution}` : `Failed: ${json.error?.message ?? "unknown"}`);
    await refreshData();
  }

  async function saveProfile() {
    try {
      const parsedMap = JSON.parse(fieldMapJson) as Record<string, string>;
      const response = await fetch("/api/imports/mapping-profiles", {
        method: "POST",
        ...shopJsonFetch,
        body: JSON.stringify({ key: profileKey, fieldMap: parsedMap }),
      });
      const json = await response.json();
      setMessage(json.ok ? "Mapping profile saved" : `Failed: ${json.error?.message ?? "unknown"}`);
      await refreshData();
    } catch {
      setMessage("Field map must be valid JSON");
    }
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4">
      <h1 className="text-xl font-semibold">Import Review Queue</h1>
      <p className="minimal-muted text-sm">Review duplicates and maintain source mapping profiles.</p>
      <p className="minimal-panel p-2 text-sm">{message}</p>

      <section className="minimal-panel p-4">
        <h2 className="text-base font-semibold">Mapping Profiles</h2>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <input
            className="rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={profileKey}
            onChange={(event) => setProfileKey(event.target.value)}
            placeholder="Profile key"
          />
          <button className="minimal-cta" onClick={saveProfile}>
            Save Profile
          </button>
        </div>
        <textarea
          className="mt-2 min-h-24 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
          value={fieldMapJson}
          onChange={(event) => setFieldMapJson(event.target.value)}
        />
        <ul className="minimal-muted mt-3 list-disc pl-5 text-sm">
          {profiles.map((profile) => (
            <li key={profile.id}>
              {profile.key} - {Object.keys(profile.valueJson?.fieldMap ?? {}).length} mapped fields
            </li>
          ))}
        </ul>
      </section>

      <section className="minimal-panel p-4">
        <h2 className="text-base font-semibold">Duplicate Rows ({duplicates.length})</h2>
        <div className="mt-3 flex flex-col gap-3">
          {duplicates.map((row) => (
            <article key={row.id} className="rounded-lg border border-[var(--border)] p-3">
              <p className="minimal-muted text-xs">
                syncLog: {row.syncLogId} | rowIndex: {row.rowIndex} | key: {row.dedupeKey ?? "n/a"}
              </p>
              <pre className="mt-2 max-h-32 overflow-auto rounded border border-[var(--border)] p-2 text-xs">
                {JSON.stringify(row.rawJson, null, 2)}
              </pre>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  className="app-button px-2 py-1 text-xs"
                  onClick={() => resolveDuplicate(row.id, "accept_duplicate")}
                >
                  Accept Duplicate
                </button>
                <button
                  className="app-button px-2 py-1 text-xs"
                  onClick={() => resolveDuplicate(row.id, "force_commit")}
                >
                  Force Commit
                </button>
                <button
                  className="app-button px-2 py-1 text-xs"
                  onClick={() => resolveDuplicate(row.id, "skip")}
                >
                  Skip
                </button>
              </div>
              {row.errorMessage ? <p className="mt-2 text-xs text-rose-600">{row.errorMessage}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
