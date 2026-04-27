import { getSupabaseClient } from "@/lib/supabase/client";
import {
  deleteSyncQueueItem,
  getSyncQueueItemsByStatus,
  updateSyncItemStatus,
  getOfflineDb,
} from "@/lib/db/indexeddb";
import { decryptJson, encryptJson } from "@/lib/db/crypto";
import type { SyncQueueItem } from "@/types/sync";

const MAX_RETRIES = 3;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

export const SYNC_FINISHED_EVENT = "hce:sync-finished";

export type SyncFlushSummary = {
  startedAt: number;
  finishedAt: number;
  processed: number;
  succeeded: number;
  failed: number;
  conflicted: number;
};

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

function getTablePriority(tableName: TableName) {
  switch (tableName) {
    case "profiles":
      return 0;
    case "patients":
      return 1;
    case "clinical_records":
      return 2;
    case "specialty_data":
      return 3;
    default:
      return 4;
  }
}

function buildSyncQueue(items: SyncQueueItem[]) {
  const latestByRecord = new Map<string, SyncQueueItem>();

  for (const item of items) {
    const key = `${item.table_name}:${item.record_id}`;
    const previous = latestByRecord.get(key);
    if (!previous || item.client_timestamp > previous.client_timestamp) {
      latestByRecord.set(key, item);
    }
  }

  return Array.from(latestByRecord.values()).sort((a, b) => {
    const priorityDiff = getTablePriority(a.table_name as TableName) - getTablePriority(b.table_name as TableName);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return a.client_timestamp - b.client_timestamp;
  });
}

function getRetryDelayMs(retryCount: number) {
  const baseDelayMs = 30_000 * 2 ** Math.max(retryCount - 1, 0);
  return Math.min(baseDelayMs, MAX_RETRY_DELAY_MS);
}

function mapPayloadByTable(tableName: TableName, payload: Record<string, unknown>) {
  switch (tableName) {
    case "profiles":
      return {
        id: payload.id,
        clinic_id: payload.clinic_id,
        doctor_id: payload.doctor_id,
        full_name: payload.full_name,
        specialty: payload.specialty,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
      };
    case "patients":
      return {
        id: payload.id,
        clinic_id: payload.clinic_id,
        doctor_id: payload.doctor_id,
        document_number: payload.document_number,
        full_name: payload.full_name,
        birth_date: payload.birth_date,
        status:
          typeof payload.status === "string" && payload.status.length > 0
            ? payload.status
            : "activo",
        created_at: payload.created_at,
        updated_at: payload.updated_at,
      };
    case "clinical_records":
      return {
        id: payload.id,
        clinic_id: payload.clinic_id,
        doctor_id: payload.doctor_id,
        patient_id: payload.patient_id,
        chief_complaint: payload.chief_complaint,
        cie_codes: payload.cie_codes,
        specialty_kind: payload.specialty_kind,
        specialty_data: payload.specialty_data,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
      };
    case "specialty_data":
      return {
        id: payload.id,
        clinic_id: payload.clinic_id,
        doctor_id: payload.doctor_id,
        clinical_record_id: payload.clinical_record_id,
        specialty_kind: payload.specialty_kind,
        data: payload.data,
        created_at: payload.created_at,
        updated_at: payload.updated_at,
      };
    default:
      return payload;
  }
}

async function syncItem(item: SyncQueueItem): Promise<"synced" | "conflicted"> {
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
    return "conflicted";
  }

  if (item.action === "delete") {
    const { error } = await tableClient.delete().eq("id", item.record_id);
    if (error) {
      throw error;
    }
  } else {
    const payload = mapPayloadByTable(tableName, {
      ...item.payload,
      id: item.record_id,
      doctor_id: item.doctor_id,
      clinic_id: item.clinic_id,
    });

    const { error } = await tableClient.upsert(payload, { onConflict: "id" });

    if (error) {
      const isPgError = (e: unknown): e is { code?: string } =>
        typeof e === "object" && e !== null && "code" in e;

      if (isPgError(error) && error.code === "23505" && tableName === "patients") {
        const { data: existingPatientRaw } = await supabase
          .from("patients")
          .select("id")
          .eq("clinic_id", item.clinic_id)
          .eq("document_number", payload.document_number as string)
          .maybeSingle();

        const existingPatient = existingPatientRaw as { id: string } | null;
        if (existingPatient && typeof existingPatient.id === "string") {
          throw new Error(`PATIENT_MERGE_REQUIRED:${existingPatient.id}`);
        }
      }
      throw error;
    }
  }

  await deleteSyncQueueItem(item.id);
  return "synced";
}

export async function flushSyncQueue(options?: { forceRetry?: boolean }) {
  const startedAt = Date.now();
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const currentDoctorId = session?.user?.id ?? null;

  const pending = await getSyncQueueItemsByStatus(["pending", "failed"], {
    includeDelayed: options?.forceRetry ?? false,
  });
  if (pending.length === 0) {
    const summary: SyncFlushSummary = {
      startedAt,
      finishedAt: Date.now(),
      processed: 0,
      succeeded: 0,
      failed: 0,
      conflicted: 0,
    };
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent<SyncFlushSummary>(SYNC_FINISHED_EVENT, {
          detail: summary,
        }),
      );
    }
    return summary;
  }

  const queue = buildSyncQueue(pending);
  let succeeded = 0;
  let failed = 0;
  let conflicted = 0;

  for (const item of queue) {
    if (!currentDoctorId) {
      const retryCount = item.retry_count + 1;
      const nextRetryAt = Date.now() + getRetryDelayMs(retryCount);

      await updateSyncItemStatus(
        item.id,
        "pending",
        "No hay sesion activa para sincronizar.",
        retryCount,
        nextRetryAt,
      );
      failed += 1;
      continue;
    }

    if (item.doctor_id !== currentDoctorId) {
      await updateSyncItemStatus(
        item.id,
        "conflicted",
        "El item pertenece a otro doctor/tenant. Descarta este item o inicia sesion con el usuario correcto.",
        item.retry_count,
      );
      conflicted += 1;
      continue;
    }

    try {
      const result = await syncItem(item);
      if (result === "conflicted") {
        conflicted += 1;
      } else {
        succeeded += 1;
      }
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
            
      if (message.startsWith("PATIENT_MERGE_REQUIRED:")) {
        const realId = message.split(":")[1];
        if (realId) {
          try {
            const db = await getOfflineDb();
            
            await deleteSyncQueueItem(item.id);
            
            const allItems = await db.getAll("sync_queue");
            for (const q of allItems) {
              if (q.table_name === "clinical_records") {
                const p = await decryptJson<Record<string, unknown>>(q.payload);
                if (p.patient_id === item.record_id) {
                  p.patient_id = realId;
                  q.payload = await encryptJson(p);
                  await db.put("sync_queue", q);
                }
              }
            }
            
            const allRecords = await db.getAll("clinical_records");
            for (const r of allRecords) {
              if (r.patient_id === item.record_id) {
                r.patient_id = realId;
                await db.put("clinical_records", r);
              }
            }
            
            await db.delete("patients", item.record_id);
            
            succeeded += 1;
            continue;
          } catch (mergeError) {
            console.error("Failed to merge duplicate patient:", mergeError);
          }
        }
      }
      
      console.error("Sync failed for item", item.table_name, item.record_id, "Error:", error, "Message:", message);
      
      const retryCount = item.retry_count + 1;
      const nextRetryAt = Date.now() + getRetryDelayMs(retryCount);

      if (retryCount >= MAX_RETRIES) {
        await updateSyncItemStatus(item.id, "abandoned", message, retryCount, nextRetryAt);
        failed += 1;
      } else {
        await updateSyncItemStatus(item.id, "pending", message, retryCount, nextRetryAt);
        failed += 1;
      }
    }
  }

  const summary: SyncFlushSummary = {
    startedAt,
    finishedAt: Date.now(),
    processed: queue.length,
    succeeded,
    failed,
    conflicted,
  };

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<SyncFlushSummary>(SYNC_FINISHED_EVENT, {
        detail: summary,
      }),
    );
  }

  return summary;
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
