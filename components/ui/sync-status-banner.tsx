"use client";

import { useEffect, useState } from "react";
import { getSyncQueueStats } from "@/lib/db/indexeddb";
import Link from "next/link";

export function SyncStatusBanner() {
  const [hasErrors, setHasErrors] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const stats = await getSyncQueueStats();
        if (active) {
          setHasErrors(stats.failed > 0 || stats.conflicted > 0);
          setHasPending(stats.pending > 0);
        }
      } catch {
        // ignore
      }
    };
    void load();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void load();
      }
    };

    const handleSyncFinished = () => {
      void load();
    };

    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("hce:sync_finished", handleSyncFinished);

    return () => {
      active = false;
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("hce:sync_finished", handleSyncFinished);
    };
  }, []);

  if (!hasErrors && !hasPending) return null;

  return (
    <Link href="/ajustes" className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs shadow-sm hover:bg-bg-soft transition">
      <span className="relative flex h-2 w-2">
        {hasPending && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${hasErrors ? 'bg-red-500' : 'bg-accent'}`}></span>
      </span>
      <span className="text-ink-soft">
        {hasErrors ? "Sincronización con errores" : "Sincronizando..."}
      </span>
    </Link>
  );
}
