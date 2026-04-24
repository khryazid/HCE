import { getSupabaseClient } from "@/lib/supabase/client";
import {
  deleteSyncQueueItem,
  getSyncQueueItemsByStatus,
  updateSyncItemStatus,
} from "@/lib/db/indexeddb";
import type { SyncQueueItem } from "@/types/sync";

const MAX_RETRIES = 3;

type TableName = "profiles" | "patients" | "clinical_records" | "specialty_data";

type SyncErrorLike = {
  message: string;
};

type TableSyncClient = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{
        data: { id: string; updated_at: string } | null;
        error: SyncErrorLike | null;
      }>;
    };
  };
  delete: () => {
    eq: (
      column: string,
      value: string,
    ) => Promise<{
      error: SyncErrorLike | null;
    }>;
  };
  upsert: (
    value: Record<string, unknown>,
    options: { onConflict: string },
  ) => Promise<{
    error: SyncErrorLike | null;
  }>;
};

function buildLatestFirstQueue(items: SyncQueueItem[]) {
  const latestByRecord = new Map<string, SyncQueueItem>();

  for (const item of items) {
    const key = `${item.table_name}:${item.record_id}`;
    const previous = latestByRecord.get(key);
    if (!previous || item.client_timestamp > previous.client_timestamp) {
      latestByRecord.set(key, item);
    }
  }

  return Array.from(latestByRecord.values()).sort(
    (a, b) => b.client_timestamp - a.client_timestamp,
  );
}

async function syncItem(item: SyncQueueItem) {
  const supabase = getSupabaseClient();
  const tableName = item.table_name as TableName;
  const tableClient = supabase.from(tableName as never) as unknown as TableSyncClient;

  await updateSyncItemStatus(item.id, "syncing");

  const { data: remote, error: remoteError } = await tableClient
    .select("id, updated_at")
    .eq("id", item.record_id)
    .maybeSingle();

  if (remoteError) {
    throw remoteError;
  }

  const remoteTime = remote?.updated_at
    ? Date.parse(remote.updated_at)
    : Number.NEGATIVE_INFINITY;

  if (remoteTime > item.client_timestamp) {
    await updateSyncItemStatus(
      item.id,
      "conflicted",
      "Remote record is newer than local payload.",
    );
    return;
  }

  if (item.action === "delete") {
    const { error } = await tableClient.delete().eq("id", item.record_id);
    if (error) {
      throw error;
    }
  } else {
    const { error } = await tableClient.upsert(
      {
        ...item.payload,
        id: item.record_id,
        doctor_id: item.doctor_id,
        clinic_id: item.clinic_id,
      },
      { onConflict: "id" },
    );

    if (error) {
      throw error;
    }
  }

  await deleteSyncQueueItem(item.id);
}

export async function flushSyncQueue() {
  const pending = await getSyncQueueItemsByStatus(["pending", "failed"]);
  if (pending.length === 0) {
    return;
  }

  const queue = buildLatestFirstQueue(pending);

  for (const item of queue) {
    try {
      await syncItem(item);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" &&
              error !== null &&
              "message" in error &&
              typeof (error as { message?: unknown }).message === "string"
            ? ((error as { message: string }).message)
            : "Unknown sync error";
      const retryCount = item.retry_count + 1;

      if (retryCount >= MAX_RETRIES) {
        await updateSyncItemStatus(item.id, "failed", message, retryCount);
      } else {
        await updateSyncItemStatus(item.id, "pending", message, retryCount);
      }
    }
  }
}

export function startSyncWorker() {
  const handleOnline = () => {
    void flushSyncQueue();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);

    if (window.navigator.onLine) {
      void flushSyncQueue();
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
    }
  };
}
