"use client";

import { useEffect } from "react";
import { startSyncWorker } from "@/lib/sync/sync-worker";

export function SyncBootstrap() {
  useEffect(() => {
    const dispose = startSyncWorker();
    return () => dispose();
  }, []);

  return null;
}
