import { getSupabaseClient } from "@/lib/supabase/client";
import {
  deleteSyncQueueItem,
  getSyncQueueItemsByStatus,
  updateSyncItemStatus,
  getOfflineDb,
  pruneOldSyncQueueItems,
} from "@/lib/db/indexeddb";
import type { SyncQueueItem } from "@/types/sync";
import { logSyncError } from "@/lib/observability/error-logger";
import {
  APP_EVENT_SYNC_ERROR,
  APP_EVENT_SYNC_ABANDONED,
  emitAppEvent,
} from "@/lib/observability/app-events";
import { MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS } from "@/lib/constants/sync";

// C-06: Evento dedicado para suscripción expirada
export const APP_EVENT_SUBSCRIPTION_EXPIRED = "hce:subscription-expired";

const MAX_RETRIES = 3;

export const SYNC_STARTED_EVENT = "hce:sync-started";
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

import type { Database, Json } from "@/types/supabase.types";
import type { SupabaseClient } from "@supabase/supabase-js";

type TableInsertMap = {
  profiles: Database["public"]["Tables"]["profiles"]["Insert"];
  patients: Database["public"]["Tables"]["patients"]["Insert"];
  clinical_records: Database["public"]["Tables"]["clinical_records"]["Insert"];
  specialty_data: Database["public"]["Tables"]["specialty_data"]["Insert"];
};

type TableInsert<T extends TableName> = TableInsertMap[T];
type SyncPayloadBase = Record<string, unknown> & {
  id: string;
  clinic_id: string;
  doctor_id: string;
};

type LogAuditEventArgs = Database["public"]["Functions"]["log_audit_event"]["Args"];

type SyncErrorLike = {
  message: string;
};

type GenericTableClient = {
  select: (columns: string) => {
    eq: (column: string, value: string) => {
      maybeSingle: () => Promise<{
        data: { id: string; updated_at: string } | null;
        error: SyncErrorLike | null;
      }>;
    };
  };
  delete: () => {
    eq: (column: string, value: string) => Promise<{ error: SyncErrorLike | null }>;
  };
  upsert: (
    value: Record<string, unknown>,
    options: { onConflict: string },
  ) => Promise<{ error: SyncErrorLike | null }>;
};

function getTableClient(supabase: SupabaseClient<Database>, tableName: TableName): GenericTableClient {
  switch (tableName) {
    case "profiles":
      return supabase.from("profiles") as unknown as GenericTableClient;
    case "patients":
      return supabase.from("patients") as unknown as GenericTableClient;
    case "clinical_records":
      return supabase.from("clinical_records") as unknown as GenericTableClient;
    case "specialty_data":
      return supabase.from("specialty_data") as unknown as GenericTableClient;
    default:
      throw new Error(`Unsupported table: ${tableName}`);
  }
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readNullableString(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readRequiredString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readJsonValue(value: unknown): Json {
  return value as Json;
}

function logAuditEvent(supabase: SupabaseClient<Database>, args: LogAuditEventArgs) {
  // Fire-and-forget: audit logging must never block sync operations.
  // Errors are silently ignored (e.g. if the user's clinic_id is null).
  void supabase.rpc("log_audit_event", args).then(({ error }) => {
    if (error) console.warn("[Audit] log_audit_event:", error.message);
  });
}

/**
 * Normalize any error thrown by the Supabase JS client into a proper Error.
 *
 * The @supabase/supabase-js client sometimes throws:
 *  - A plain object { message, code } from PostgREST
 *  - A TypeError "Cannot read properties of undefined (reading 'rest')" when
 *    the HTTP response body is empty (e.g. a 403/network error with no JSON).
 * We convert all cases to a real Error so the flush loop can extract .message.
 */
function normalizeError(err: unknown): Error {
  if (err instanceof Error) return err;

  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const msg =
      typeof obj.message === "string" && obj.message
        ? obj.message
        : typeof obj.hint === "string" && obj.hint
          ? obj.hint
          : `Supabase error (code: ${obj.code ?? "unknown"})`;
    const wrapped = new Error(msg);
    if (typeof obj.code === "string") (wrapped as Error & { code?: string }).code = obj.code;
    return wrapped;
  }

  return new Error(String(err));
}

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
  const baseDelayMs = BASE_RETRY_DELAY_MS * 2 ** Math.max(retryCount - 1, 0);
  return Math.min(baseDelayMs, MAX_RETRY_DELAY_MS);
}

function mapPayloadByTable<T extends TableName>(
  tableName: T,
  payload: SyncPayloadBase,
): TableInsert<T> {
  switch (tableName) {
    case "profiles": {
      const mapped: TableInsert<"profiles"> = {
        id: readOptionalString(payload.id),
        clinic_id: readRequiredString(payload.clinic_id),
        doctor_id: readRequiredString(payload.doctor_id),
        full_name: readRequiredString(payload.full_name),
        specialty: readStringArray(payload.specialty),
        created_at: readOptionalString(payload.created_at),
        updated_at: readOptionalString(payload.updated_at),
      };
      return mapped as TableInsert<T>;
    }
    case "patients": {
      const status = readOptionalString(payload.status);
      const mapped: TableInsert<"patients"> = {
        id: readOptionalString(payload.id),
        clinic_id: readRequiredString(payload.clinic_id),
        doctor_id: readRequiredString(payload.doctor_id),
        document_number: readRequiredString(payload.document_number),
        full_name: readRequiredString(payload.full_name),
        birth_date: readNullableString(payload.birth_date),
        status:
          status && status.length > 0
            ? status
            : "activo",
        created_at: readOptionalString(payload.created_at),
        updated_at: readOptionalString(payload.updated_at),
      };
      return mapped as TableInsert<T>;
    }
    case "clinical_records": {
      const mapped: TableInsert<"clinical_records"> = {
        id: readOptionalString(payload.id),
        clinic_id: readRequiredString(payload.clinic_id),
        doctor_id: readRequiredString(payload.doctor_id),
        patient_id: readRequiredString(payload.patient_id),
        chief_complaint: readRequiredString(payload.chief_complaint),
        cie_codes: readStringArray(payload.cie_codes),
        specialty_kind: readRequiredString(payload.specialty_kind),
        specialty_data: readJsonValue(payload.specialty_data),
        created_at: readOptionalString(payload.created_at),
        updated_at: readOptionalString(payload.updated_at),
      };
      return mapped as TableInsert<T>;
    }
    case "specialty_data": {
      const mapped: TableInsert<"specialty_data"> = {
        id: readOptionalString(payload.id),
        clinic_id: readRequiredString(payload.clinic_id),
        doctor_id: readRequiredString(payload.doctor_id),
        clinical_record_id: readRequiredString(payload.clinical_record_id),
        specialty_kind: readRequiredString(payload.specialty_kind),
        data: readJsonValue(payload.data),
        created_at: readOptionalString(payload.created_at),
        updated_at: readOptionalString(payload.updated_at),
      };
      return mapped as TableInsert<T>;
    }
    default: {
      return payload as TableInsert<T>;
    }
  }
}

async function syncItem(item: SyncQueueItem): Promise<"synced" | "conflicted"> {
  const supabase = getSupabaseClient() as SupabaseClient<Database>;
  const tableName = item.table_name as TableName;
  const tableClient = getTableClient(supabase, tableName);

  await updateSyncItemStatus(item.id, "syncing");

  const { data: remote, error: remoteError } = await tableClient
    .select("id, updated_at")
    .eq("id", item.record_id)
    .maybeSingle();

  if (remoteError) {
    // C-06: Detectar 42501 (suscripción inactiva / RLS denegado) en la lectura de remote
    const errObj = remoteError as { code?: string };
    if (errObj.code === "42501") {
      emitAppEvent(APP_EVENT_SUBSCRIPTION_EXPIRED, {
        message: "Tu suscripción expiró. Los datos locales están seguros y se sincronizarán al renovar.",
      });
      throw new Error(`SUBSCRIPTION_EXPIRED:42501`);
    }
    throw normalizeError(remoteError);
  }

  const remoteTime = remote?.updated_at
    ? Date.parse(remote.updated_at)
    : Number.NEGATIVE_INFINITY;

  if (remoteTime > item.client_timestamp) {
    // Sync-1.3: A-10 upgrade — instead of silently deleting the local change,
    // mark it as "conflicted" so the doctor can see it in the SyncQueuePanel
    // and decide whether to discard or retry manually. Also emit the abandoned
    // event (higher UI prominence than sync_error) so the banner turns red.
    const conflictMessage =
      `Conflicto en "${tableName}": el servidor tiene una versión más reciente (clock drift). ` +
      "Tu cambio local está guardado como conflicto — revísalo en Ajustes › Sincronización.";

    await updateSyncItemStatus(item.id, "conflicted", conflictMessage, item.retry_count);

    emitAppEvent(APP_EVENT_SYNC_ABANDONED, {
      source: "clock-drift",
      itemId: item.id,
      tableName,
      recordId: item.record_id,
      message: conflictMessage,
      retryCount: item.retry_count,
    });
    return "conflicted";
  }

  if (item.action === "delete") {
    const { error } = await tableClient.delete().eq("id", item.record_id);
    if (error) {
      throw error;
    }
    
    await logAuditEvent(supabase, {
      p_clinic_id: item.clinic_id,
      p_doctor_id: item.doctor_id,
      p_event_type: "delete",
      p_resource_type: tableName,
      p_resource_id: item.record_id,
      p_changes: { deleted_via: "sync_worker" },
    });
  } else {
    const payload = mapPayloadByTable(tableName, {
      ...item.payload,
      id: item.record_id,
      doctor_id: item.doctor_id,
      clinic_id: item.clinic_id,
    });

    const { error } = await tableClient.upsert(payload, { onConflict: "id" });

    if (error) {
      // C-06: Detectar 42501 en la escritura del upsert
      const errObj = error as { code?: string };
      if (errObj.code === "42501") {
        emitAppEvent(APP_EVENT_SUBSCRIPTION_EXPIRED, {
          message: "Tu suscripción expiró. Los datos locales están seguros y se sincronizarán al renovar.",
        });
        throw new Error(`SUBSCRIPTION_EXPIRED:42501`);
      }

      const isPgError = (e: unknown): e is { code?: string } =>
        typeof e === "object" && e !== null && "code" in e;

      if (isPgError(error) && error.code === "23505" && tableName === "patients") {
        const patientPayload = payload as TableInsert<"patients">;
        const { data: existingPatientRaw } = await supabase
          .from("patients")
          .select("id")
          .eq("clinic_id", item.clinic_id)
          .eq("document_number", patientPayload.document_number)
          .maybeSingle();

        const existingPatient = existingPatientRaw as { id: string } | null;
        if (existingPatient && typeof existingPatient.id === "string") {
          throw new Error(`PATIENT_MERGE_REQUIRED:${existingPatient.id}`);
        }
      }
      throw normalizeError(error);
    }

    // Determine event type based on action
    const eventType = item.action === "update" ? "update" : "create";
    await logAuditEvent(supabase, {
      p_clinic_id: item.clinic_id,
      p_doctor_id: item.doctor_id,
      p_event_type: eventType,
      p_resource_type: tableName,
      p_resource_id: item.record_id,
      p_changes: payload as unknown as import("@/types/supabase.types").Json,
      // @ts-expect-error: schema modified but types not regenerated yet
      p_client_timestamp: item.client_timestamp,
    });
  }

  await deleteSyncQueueItem(item.id);
  return "synced";
}

export async function flushSyncQueue(options?: { forceRetry?: boolean }) {
  if (typeof window === "undefined") return;

  // Usa Web Locks API para asegurar que solo una pestaña a la vez ejecuta el flush.
  // Fallback a ejecución simple en entornos sin navigator.locks (ej. Safari muy antiguo).
  if (navigator.locks) {
    return navigator.locks.request("hce-sync-lock", { ifAvailable: true }, async (lock) => {
      if (!lock) {
        console.log("[sync-worker] Sincronización bloqueada por otra pestaña.");
        return;
      }
      return _flushSyncQueueInner(options);
    });
  } else {
    return _flushSyncQueueInner(options);
  }
}

async function _flushSyncQueueInner(options?: { forceRetry?: boolean }) {

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SYNC_STARTED_EVENT));
  }

  const startedAt = Date.now();
  const supabase = getSupabaseClient() as SupabaseClient<Database>;
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // If the session is invalid (e.g. refresh token revoked), skip this flush
  // gracefully. The middleware will redirect to login on the next navigation.
  if (authError || !user) {
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

  const currentDoctorId = user.id;

  try {
    // Sync-1.2: Prune old items before processing
    await pruneOldSyncQueueItems(7, 30);
  } catch (err) {
    console.error("[sync-worker] Failed to prune old sync queue items:", err);
  }

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

  // Rastreo de IDs que fallaron para no procesar sus dependientes en el mismo flush.
  // patients fallidos → clinical_records saltados → specialty_data saltados.
  const failedPatientIds = new Set<string>();
  const failedRecordIds = new Set<string>();

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

    // Guardia de dependencias: si el parent falló en este flush, no intentamos
    // el hijo para evitar FK violations encadenadas.
    if (item.table_name === "clinical_records") {
      const payload = item.payload as Record<string, unknown>;
      const patientId = typeof payload.patient_id === "string" ? payload.patient_id : undefined;
      if (patientId && failedPatientIds.has(patientId)) {
        // Propagate failure to protect specialty_data
        failedRecordIds.add(item.record_id);
        continue;
      }
    }

    if (item.table_name === "specialty_data") {
      const payload = item.payload as Record<string, unknown>;
      const recordId = typeof payload.clinical_record_id === "string" ? payload.clinical_record_id : undefined;
      if (recordId && failedRecordIds.has(recordId)) {
        continue;
      }
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

      // C-06: Si la suscripción expiró, marcar como conflicted sin reintentar
      if (message.startsWith("SUBSCRIPTION_EXPIRED:")) {
        await updateSyncItemStatus(
          item.id,
          "conflicted",
          "Suscripción inactiva (42501) — renovar plan para sincronizar",
          item.retry_count,
        );
        conflicted += 1;
        continue;
      }
            
      if (message.startsWith("PATIENT_MERGE_REQUIRED:")) {
        const realId = message.split(":")[1];
        if (realId) {
          try {
            const db = await getOfflineDb();

            await deleteSyncQueueItem(item.id);

            // Corregir patient_id en clinical_records pendientes de sync
            const allQueueItems = await db.getAll("sync_queue");
            const affectedQueueItems = allQueueItems.filter(
              (q) => q.table_name === "clinical_records",
            );
            for (const q of affectedQueueItems) {
              const p = q.payload as Record<string, unknown>;
              if (p.patient_id === item.record_id) {
                p.patient_id = realId;
                await db.put("sync_queue", q);
              }
            }

            // Corregir patient_id en clinical_records locales
            const affectedRecords = await db.getAllFromIndex("clinical_records", "by_patient", item.record_id);
            for (const r of affectedRecords) {
              r.patient_id = realId;
              await db.put("clinical_records", r);
            }

            await db.delete("patients", item.record_id);

            succeeded += 1;
            continue;
          } catch (mergeError) {
            logSyncError(
              `merge:${item.table_name}:${item.record_id}`,
              "Fallo al fusionar paciente duplicado",
              { mergeError: String(mergeError) },
              "critical",
            );
          }
        }
      }

      // Registrar el ID del registro fallido para proteger dependientes en este flush
      if (item.table_name === "patients") {
        failedPatientIds.add(item.record_id);
      } else if (item.table_name === "clinical_records") {
        failedRecordIds.add(item.record_id);
      }

      logSyncError(
        `flush:${item.table_name}:${item.record_id}`,
        message,
        { retryCount: item.retry_count, tableName: item.table_name },
      );

      emitAppEvent(APP_EVENT_SYNC_ERROR, {
        itemId: item.id,
        tableName: item.table_name,
        recordId: item.record_id,
        message,
        retryCount: item.retry_count,
      });
      
      const retryCount = item.retry_count + 1;
      const nextRetryAt = Date.now() + getRetryDelayMs(retryCount);

      if (retryCount >= MAX_RETRIES) {
        await updateSyncItemStatus(item.id, "abandoned", message, retryCount, nextRetryAt);
        
        // Try to log abandoned event to Supabase for Admin monitoring
        try {
          await logAuditEvent(supabase, {
            p_clinic_id: item.clinic_id,
            p_doctor_id: item.doctor_id,
            p_event_type: "sync_abandoned",
            p_resource_type: item.table_name,
            p_resource_id: item.record_id,
            p_changes: { error: message, original_payload: item.payload } as unknown as import("@/types/supabase.types").Json,
          });
        } catch {
          // If offline, we simply ignore this telemetry
        }

        emitAppEvent(APP_EVENT_SYNC_ABANDONED, {
          itemId: item.id,
          tableName: item.table_name,
          recordId: item.record_id,
          message,
          retryCount,
        });
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
    void flushSyncQueue().catch((err) => {
      logSyncError("flush_trigger", "Unhandled error starting flushSyncQueue", { error: String(err) });
    });
  };

  if (typeof window !== "undefined") {
    window.addEventListener("online", handleOnline);
    window.addEventListener("hce:sync-enqueued", handleOnline);

    if (window.navigator.onLine) {
      void flushSyncQueue().catch((err) => {
        logSyncError("flush_trigger", "Unhandled error on initial flushSyncQueue", { error: String(err) });
      });
    }
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("hce:sync-enqueued", handleOnline);
    }
  };
}
