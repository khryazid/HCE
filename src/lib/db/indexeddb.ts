import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { deriveKey, encryptData, decryptData } from "./crypto";
import type { SyncQueueItem, SyncStatus } from "@/types/sync";
import type { PatientRecord, PatientStatus } from "@/features/patients/types";
import type {
  ClinicalRecordRecord,
  SpecialtyDataRow,
} from "@/features/consultations/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS } from "@/lib/constants/sync";
import { APP_EVENT_SYNC_ERROR, emitAppEvent } from "@/lib/observability/app-events";

/**
 * Opción B de cifrado: sin cifrado local de PHI.
 * Los datos se almacenan en texto plano en IndexedDB.
 * La seguridad está garantizada por autenticación + RLS en Supabase + HTTPS.
 * Esto permite multidevice transparente sin gestión de claves por el usuario.
 */

const DB_VERSION = 3; // Bump to v3 for encryption migration
const DEFAULT_RETRY_DELAY_MS = BASE_RETRY_DELAY_MS;

let cryptoKey: CryptoKey | null = null;
let activeDbUserId: string | null = null;
let dbPromise: Promise<IDBPDatabase<HceOfflineSchema>> | null = null;

/**
 * C-05: Promise compartida de inicialización de crypto.
 * Múltiples llamadas concurrentes a ensureCrypto() aguardarán
 * la misma promise en lugar de derivar claves en paralelo.
 */
let cryptoInitPromise: Promise<CryptoKey> | null = null;

export async function initDbCrypto(userId: string) {
  // C-05: Crear una sola promise y compartirla
  cryptoInitPromise = deriveKey(userId);
  cryptoKey = await cryptoInitPromise;
}

async function ensureCrypto() {
  // C-05: Si hay una init en curso (o completa), aguardar esa misma promise
  if (cryptoInitPromise) {
    cryptoKey = await cryptoInitPromise;
    return cryptoKey;
  }
  if (!cryptoKey) {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user.id) {
      // C-05: Serializar via la promise compartida
      cryptoInitPromise = deriveKey(session.user.id);
      cryptoKey = await cryptoInitPromise;
    } else {
      throw new Error("DB Crypto Key not initialized and no session found");
    }
  }
  return cryptoKey;
}

// Wrapper for encryption/decryption.
// wrapData is generic so callers can assert the result as `T` safely —
// at runtime the encrypted store value always satisfies T's required indexed fields.
async function wrapData<T extends Record<string, unknown>>(
  data: unknown,
  indexedFields: Record<string, unknown>,
): Promise<T> {
  const key = await ensureCrypto();
  const encrypted = await encryptData(key, data);
  return { ...indexedFields, __encrypted_payload: encrypted } as unknown as T;
}

async function unwrapData<T>(record: T): Promise<T> {
  if (!record) return record;
  const r = record as Record<string, unknown>;
  if (!r.__encrypted_payload) return record; // Already plaintext (unmigrated)
  const key = await ensureCrypto();
  return (await decryptData(key, r.__encrypted_payload as string)) as T;
}

interface HceOfflineSchema extends DBSchema {
  profiles: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      by_doctor: string;
      by_clinic: string;
      by_updated_at: number;
    };
  };
  patients: {
    key: string;
    value: {
      id: string;
      clinic_id: string;
      doctor_id: string;
      document_number: string;
      full_name: string;
      birth_date: string | null;
      status: PatientStatus;
      created_at: string;
      updated_at: string;
    };
    indexes: {
      by_doctor: string;
      by_clinic: string;
      by_updated_at: string;
    };
  };
  clinical_records: {
    key: string;
    value: {
      id: string;
      clinic_id: string;
      doctor_id: string;
      patient_id: string;
      specialty_kind: string;
      chief_complaint: string;
      cie_codes: string[];
      specialty_data: ClinicalRecordRecord["specialty_data"];
      created_at: string;
      updated_at: string;
    };
    indexes: {
      by_patient: string;
      by_doctor: string;
      by_updated_at: string;
    };
  };
  specialty_data: {
    key: string;
    value: {
      id: string;
      clinic_id: string;
      doctor_id: string;
      clinical_record_id: string;
      specialty_kind: string;
      data: SpecialtyDataRow["data"];
      created_at: string;
      updated_at: string;
    };
    indexes: {
      by_record: string;
      by_doctor: string;
      by_updated_at: string;
    };
  };
  sync_queue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      by_status: SyncStatus;
      by_timestamp: number;
      by_table_record: string;
    };
  };
}

async function getUserId() {
  if (activeDbUserId) return activeDbUserId;
  const supabase = getSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) throw new Error("No user session");
  return session.user.id;
}

export async function clearOfflineDb() {
  const userId = await getUserId().catch(() => null);
  if (!userId) return;
  const dbName = `hce-offline-db-${userId}`;
  
  if (dbPromise) {
    const db = await dbPromise;
    db.close();
    dbPromise = null;
  }
  
  const { deleteDB } = await import("idb");
  await deleteDB(dbName);
  cryptoInitPromise = null; // C-05: Limpiar para el próximo usuario
  cryptoKey = null;
}

export async function getOfflineDb() {
  const userId = await getUserId();
  const dbName = `hce-offline-db-${userId}`;

  if (!dbPromise || activeDbUserId !== userId) {
    activeDbUserId = userId;
    dbPromise = openDB<HceOfflineSchema>(dbName, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 → v2: recrea todos los stores sin payload cifrado.
        // Los datos locales cifrados de v1 no son migrables (requieren la clave),
        // así que los descartamos. Los datos canónicos viven en Supabase y se
        // vuelven a descargar en la próxima carga online.
        if (oldVersion < 2) {
          const stores = ["profiles", "patients", "clinical_records", "specialty_data", "sync_queue"] as const;

          // M-10: El callback upgrade() es síncrono (restricción nativa IDB).
          // Si sync_queue existe, emitir aviso antes de destruirla.
          if (db.objectStoreNames.contains("sync_queue")) {
            console.warn(
              "[IDB M-10] Migración v1→v2: stores locales recreados. " +
              "Si había cambios en la cola de sync, conéctate para re-sincronizarlos.",
            );
            queueMicrotask(() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent(APP_EVENT_SYNC_ERROR, {
                    detail: {
                      source: "idb-upgrade",
                      message:
                        "Base de datos local actualizada. Si tenías cambios pendientes, " +
                        "conecta a internet para que se re-sincronicen automáticamente.",
                    },
                  }),
                );
              }
            });
          }

          for (const s of stores) {
            if (db.objectStoreNames.contains(s)) {
              db.deleteObjectStore(s);
            }
          }
        }

        if (!db.objectStoreNames.contains("profiles")) {
          const store = db.createObjectStore("profiles", { keyPath: "id" });
          store.createIndex("by_doctor", "doctor_id");
          store.createIndex("by_clinic", "clinic_id");
          store.createIndex("by_updated_at", "updated_at");
        }

        if (!db.objectStoreNames.contains("patients")) {
          const store = db.createObjectStore("patients", { keyPath: "id" });
          store.createIndex("by_doctor", "doctor_id");
          store.createIndex("by_clinic", "clinic_id");
          store.createIndex("by_updated_at", "updated_at");
        }

        if (!db.objectStoreNames.contains("clinical_records")) {
          const store = db.createObjectStore("clinical_records", { keyPath: "id" });
          store.createIndex("by_patient", "patient_id");
          store.createIndex("by_doctor", "doctor_id");
          store.createIndex("by_updated_at", "updated_at");
        }

        if (!db.objectStoreNames.contains("specialty_data")) {
          const store = db.createObjectStore("specialty_data", { keyPath: "id" });
          store.createIndex("by_record", "clinical_record_id");
          store.createIndex("by_doctor", "doctor_id");
          store.createIndex("by_updated_at", "updated_at");
        }

        if (!db.objectStoreNames.contains("sync_queue")) {
          const store = db.createObjectStore("sync_queue", { keyPath: "id" });
          store.createIndex("by_status", "status");
          store.createIndex("by_timestamp", "client_timestamp");
          store.createIndex("by_table_record", "table_name_record_id");
        }
      },
    });
  }

  return dbPromise;
}

// ─── Sync Queue ───────────────────────────────────────────────────────────────

export async function enqueueSyncItem(item: SyncQueueItem) {
  // A-07: Guardia pre-enqueue — si el patient está 'abandoned', no encolar
  // el clinical_record (tendría FK violation garantizada en el flush).
  if (item.table_name === "clinical_records") {
    const payload = item.payload as Record<string, unknown>;
    const patientId = typeof payload.patient_id === "string" ? payload.patient_id : null;
    if (patientId) {
      const db = await getOfflineDb();
      const allItemsRaw = await db.getAll("sync_queue");
      // unwrapData puede fallar si crypto no está listo; en ese caso propagamos el error
      const allItems = await Promise.all(allItemsRaw.map(unwrapData));
      const patientAbandoned = allItems.some(
        (q) => q.table_name === "patients" &&
               q.record_id === patientId &&
               q.status === "abandoned",
      );
      if (patientAbandoned) {
        throw new Error(
          `A-07: No se puede encolar la consulta — el paciente ${patientId} falló permanentemente en la cola de sync. Contacta soporte.`,
        );
      }
    }
  }

  const db = await getOfflineDb();
  
  const payloadToEncrypt = {
    ...item,
    table_name_record_id: `${item.table_name}:${item.record_id}`,
    payload: {
      ...item.payload,
      doctor_id: item.doctor_id,
      clinic_id: item.clinic_id,
    },
    next_retry_at: item.next_retry_at ?? Date.now(),
  };

  const wrapped = await wrapData<SyncQueueItem>(payloadToEncrypt, {
    id: item.id,
    status: item.status,
    client_timestamp: item.client_timestamp,
    table_name_record_id: `${item.table_name}:${item.record_id}`,
  });

        await db.put("sync_queue", wrapped);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("hce:sync-enqueued"));
  }
}

function isRetryDue(item: SyncQueueItem, now: number) {
  return typeof item.next_retry_at !== "number" || item.next_retry_at <= now;
}

export async function getSyncQueueItemsByStatus(
  statuses: SyncStatus[],
  options?: { includeDelayed?: boolean },
) {
  const db = await getOfflineDb();
  const allItemsRaw = await db.getAll("sync_queue");
  const allItems = await Promise.all(allItemsRaw.map(unwrapData));
  const now = Date.now();

  return allItems.filter((item) => {
    if (!statuses.includes(item.status)) return false;
    if (options?.includeDelayed) return true;
    return isRetryDue(item, now);
  });
}

export async function updateSyncItemStatus(
  id: string,
  status: SyncStatus,
  lastError?: string,
  retryCountOverride?: number,
  nextRetryAtOverride?: number,
) {
  const db = await getOfflineDb();
  const currentRaw = await db.get("sync_queue", id);
  const current = await unwrapData(currentRaw);

  if (!current) return;

  const retryCount =
    typeof retryCountOverride === "number"
      ? retryCountOverride
      : status === "failed"
        ? current.retry_count + 1
        : current.retry_count;

  const nextRetryAt =
    typeof nextRetryAtOverride === "number"
      ? nextRetryAtOverride
      : status === "done" || status === "conflicted" || status === "abandoned"
        ? undefined
        : Date.now() + Math.min(DEFAULT_RETRY_DELAY_MS * 2 ** Math.max(retryCount - 1, 0), MAX_RETRY_DELAY_MS);

  const updatedItem = {
    ...current,
    status,
    retry_count: retryCount,
    last_error: lastError,
    next_retry_at: nextRetryAt,
  };

  const wrapped = await wrapData<SyncQueueItem>(updatedItem, {
    id: updatedItem.id,
    status: updatedItem.status,
    client_timestamp: updatedItem.client_timestamp,
    table_name_record_id: updatedItem.table_name_record_id,
  });

        await db.put("sync_queue", wrapped);
}

export async function deleteSyncQueueItem(id: string) {
  const db = await getOfflineDb();
  await db.delete("sync_queue", id);
}

export async function getSyncQueueStats() {
  const db = await getOfflineDb();
  const allItemsRaw = await db.getAll("sync_queue");
  const allItems = await Promise.all(allItemsRaw.map(unwrapData));

  return {
    pending: allItems.filter((i) => i.status === "pending").length,
    failed: allItems.filter((i) => i.status === "failed").length,
    abandoned: allItems.filter((i) => i.status === "abandoned").length,
    conflicted: allItems.filter((i) => i.status === "conflicted").length,
  };
}

export async function listSyncQueueItems() {
  const db = await getOfflineDb();
  const allItemsRaw = await db.getAll("sync_queue");
  const allItems = await Promise.all(allItemsRaw.map(unwrapData));
  return allItems.sort((a, b) => b.client_timestamp - a.client_timestamp);
}

/**
 * Removes all ABANDONED sync queue items from IndexedDB.
 *
 * Also removes any PENDING or FAILED items targeting the same record_id
 * as an abandoned item — those are orphaned operations that will never
 * succeed because their parent delete/update already failed permanently.
 *
 * @returns number of items removed
 */
export async function purgeAbandonedSyncItems(): Promise<number> {
  const db = await getOfflineDb();
  const allItemsRaw = await db.getAll("sync_queue");
  const allItems = await Promise.all(allItemsRaw.map(unwrapData));

  // Collect record_ids of all abandoned items
  const abandonedRecordIds = new Set<string>(
    allItems.filter((i) => i.status === "abandoned").map((i) => i.record_id),
  );

  const toDelete = allItems.filter(
    (i) =>
      i.status === "abandoned" ||
      // Orphaned pending/failed ops on the same record as an abandoned item
      ((i.status === "pending" || i.status === "failed") &&
        abandonedRecordIds.has(i.record_id)),
  );

  const tx = db.transaction("sync_queue", "readwrite");
  await Promise.all(toDelete.map((i) => tx.store.delete(i.id)));
  await tx.done;

  return toDelete.length;
}

/**
 * Removes old sync queue items based on a TTL.
 * Default TTL is 7 days.
 * Only removes items that are 'abandoned', 'conflicted' or 'done'. 
 * It also removes 'failed' items if they have exceeded a secondary longer TTL (e.g., 30 days) 
 * to prevent indefinite growth of items that were never explicitly abandoned.
 */
export async function pruneOldSyncQueueItems(
  ttlDays: number = 7,
  failedTtlDays: number = 30,
): Promise<number> {
  const db = await getOfflineDb();
  const allItemsRaw = await db.getAll("sync_queue");
  const allItems = await Promise.all(allItemsRaw.map(unwrapData));

  const now = Date.now();
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  const failedTtlMs = failedTtlDays * 24 * 60 * 60 * 1000;

  const toDelete = allItems.filter((i) => {
    const ageMs = now - i.client_timestamp;
    if (i.status === "abandoned" || i.status === "conflicted" || i.status === "done") {
      return ageMs > ttlMs;
    }
    if (i.status === "failed") {
      return ageMs > failedTtlMs;
    }
    return false;
  });

  if (toDelete.length === 0) return 0;

  const tx = db.transaction("sync_queue", "readwrite");
  await Promise.all(toDelete.map((i) => tx.store.delete(i.id)));
  await tx.done;

  return toDelete.length;
}

// ─── Patients ─────────────────────────────────────────────────────────────────

/**
 * Helper to prevent remote refresh from overwriting local un-synced changes
 * or resurrecting locally deleted items.
 */
/**
 * C-04: Si unwrapData falla por crypto, Promise.all rechaza y la excepción
 * se propaga al llamador. Los callers (refreshPatients*, etc.) deben
 * capturar solo errores de red, no crypto. Ver refreshPatientsFromRemote.
 */
async function getPendingRecordIds(tableName: string): Promise<Set<string>> {
  const db = await getOfflineDb();
  const allItemsRaw = await db.getAll("sync_queue");
  const allItems = await Promise.all(allItemsRaw.map(unwrapData));
  const pendingIds = new Set<string>();
  for (const item of allItems) {
    // Sync-2.3: Also protect "syncing" items — they are mid-flight in an active
    // flush. Excluding them would let a concurrent Realtime refresh delete the
    // local record before the upsert is confirmed, causing data loss.
    if (
      item.table_name === tableName &&
      (item.status === "pending" || item.status === "failed" || item.status === "syncing")
    ) {
      pendingIds.add(item.record_id);
    }
  }
  return pendingIds;
}

export async function refreshPatientsFromRemote(clinicId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) return false;

    const { data: remotePatients, error } = await supabase
      .from("patients")
      .select("id, clinic_id, doctor_id, document_number, full_name, birth_date, status, created_at, updated_at")
      .eq("clinic_id", clinicId);

    if (error || !remotePatients) return false;

    const pendingIds = await getPendingRecordIds("patients");
    const db = await getOfflineDb();
    
    const typedPatients = (remotePatients as PatientRecord[]).filter((p) => !pendingIds.has(p.id));
    
    const allLocalRaw = await db.getAll("patients");
    const allLocal = await Promise.all(allLocalRaw.map(unwrapData)) as PatientRecord[];
    const localForClinic = allLocal.filter(p => p.clinic_id === clinicId);
    
    const remoteIds = new Set(remotePatients.map(p => p.id));
    const idsToDelete = localForClinic.map(p => p.id).filter(id => !remoteIds.has(id) && !pendingIds.has(id));

    await Promise.all([
      ...typedPatients.map(async (patient) => {
        const wrapped = await wrapData<HceOfflineSchema["patients"]["value"]>(patient, {
          id: patient.id,
          clinic_id: patient.clinic_id,
          doctor_id: patient.doctor_id,
          updated_at: patient.updated_at,
        });
      db.put("patients", wrapped);
      }),
      ...idsToDelete.map(id => db.delete("patients", id))
    ]);
    return true;
  } catch {
    // Network error or IDB write failure — caller falls back to local cache.
    return false;
  }
}

/**
 * Returns all patients for a clinic from the **local IndexedDB cache**.
 *
 * This is a pure local read — no network calls.
 * To ensure fresh data, call `refreshPatientsFromRemote` first (the sync
 * worker does this automatically after each sync cycle).
 */
export async function listPatientsByTenant(clinicId: string) {
  const db = await getOfflineDb();
  // Sync-2.1: Use the by_clinic index instead of a full-table scan so we
  // only decrypt and return records for the active clinic — O(clinic) not O(all).
  // Note: the IDB index holds plaintext clinic_id as an indexed field (set in
  // wrapData), so getAllFromIndex works even though the payload is encrypted.
  const rowsRaw = await db.getAllFromIndex("patients", "by_clinic", clinicId);
  const patients = await Promise.all(rowsRaw.map(unwrapData));
  return patients.sort((a, b) => b.updated_at.localeCompare(a.updated_at)) as PatientRecord[];
}

export async function savePatientLocal(patient: PatientRecord) {
  // A-08: Envolver escritura IDB en try/catch + emitir evento de error
  try {
    const db = await getOfflineDb();
    const payload = {
      ...patient,
      status: patient.status ?? "activo",
    };
    const wrapped = await wrapData<HceOfflineSchema["patients"]["value"]>(payload, {
      id: patient.id,
      clinic_id: patient.clinic_id,
      doctor_id: patient.doctor_id,
      updated_at: patient.updated_at,
    });
        await db.put("patients", wrapped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "IDB write error (patients)";
    emitAppEvent(APP_EVENT_SYNC_ERROR, {
      itemId: patient.id,
      tableName: "patients",
      recordId: patient.id,
      message: `Error al guardar paciente localmente: ${message}`,
      retryCount: 0,
    });
    throw err; // Reraise so callers know the write failed
  }
}

export async function deletePatientLocal(id: string) {
  const db = await getOfflineDb();
  await db.delete("patients", id);

  const recordKeys = await db.getAllKeysFromIndex("clinical_records", "by_patient", id);
  for (const recordKey of recordKeys) {
    await db.delete("clinical_records", recordKey);
    const specialtyKeys = await db.getAllKeysFromIndex("specialty_data", "by_record", recordKey);
    for (const specKey of specialtyKeys) {
      await db.delete("specialty_data", specKey);
    }
  }
}

export async function updatePatientStatusLocal(id: string, status: PatientStatus) {
  const db = await getOfflineDb();
  const rawExisting = await db.get("patients", id);
  if (!rawExisting) return;
  const existing = await unwrapData(rawExisting);

  const updated = {
    ...existing,
    status,
    updated_at: new Date().toISOString(),
  };

  const wrapped = await wrapData<HceOfflineSchema["patients"]["value"]>(updated, {
    id: updated.id,
    clinic_id: updated.clinic_id,
    doctor_id: updated.doctor_id,
    updated_at: updated.updated_at,
  });

      await db.put("patients", wrapped);
}

// ─── Clinical Records ─────────────────────────────────────────────────────────

export async function refreshClinicalRecordsFromRemote(clinicId: string, doctorId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data: remoteRecords, error } = await supabase
      .from("clinical_records")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId);

    if (error || !remoteRecords) return false;

    const pendingIds = await getPendingRecordIds("clinical_records");
    const db = await getOfflineDb();
    
    const typedRecords = (remoteRecords as ClinicalRecordRecord[]).filter((r) => !pendingIds.has(r.id));
    
    const allLocalRaw = await db.getAll("clinical_records");
    const allLocal = await Promise.all(allLocalRaw.map(unwrapData)) as ClinicalRecordRecord[];
    const localForDoctor = allLocal.filter(r => r.clinic_id === clinicId && r.doctor_id === doctorId);
    
    const remoteIds = new Set(remoteRecords.map(r => r.id));
    const idsToDelete = localForDoctor.map(r => r.id).filter(id => !remoteIds.has(id) && !pendingIds.has(id));

    await Promise.all([
      ...typedRecords.map(async (record) => {
        const wrapped = await wrapData<HceOfflineSchema["clinical_records"]["value"]>(record, {
          id: record.id,
          patient_id: record.patient_id,
          doctor_id: record.doctor_id,
          updated_at: record.updated_at,
        });
      db.put("clinical_records", wrapped);
      }),
      ...idsToDelete.map(id => db.delete("clinical_records", id))
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function listClinicalRecordsByTenant(doctorId: string, clinicId: string) {
  const db = await getOfflineDb();
  // Sync-2.1: Use the by_doctor index then filter by clinic_id in memory.
  // clinical_records lacks a compound (clinic_id, doctor_id) index, so we use
  // the existing by_doctor index (most selective in single-doctor tenants) and
  // post-filter by clinicId — still far better than a full-table scan.
  const rowsRaw = await db.getAllFromIndex("clinical_records", "by_doctor", doctorId);
  const records = await Promise.all(rowsRaw.map(unwrapData));
  return records
    .filter((r) => r.clinic_id === clinicId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)) as ClinicalRecordRecord[];
}

export async function saveClinicalRecordLocal(record: ClinicalRecordRecord) {
  // A-08: Envolver escritura IDB en try/catch + emitir evento de error
  try {
    const db = await getOfflineDb();
    const wrapped = await wrapData<HceOfflineSchema["clinical_records"]["value"]>(record, {
      id: record.id,
      patient_id: record.patient_id,
      doctor_id: record.doctor_id,
      updated_at: record.updated_at,
    });
        await db.put("clinical_records", wrapped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "IDB write error (clinical_records)";
    emitAppEvent(APP_EVENT_SYNC_ERROR, {
      itemId: record.id,
      tableName: "clinical_records",
      recordId: record.id,
      message: `Error al guardar consulta localmente: ${message}`,
      retryCount: 0,
    });
    throw err; // Reraise so callers know the write failed
  }
}

export async function deleteClinicalRecordLocal(id: string) {
  const db = await getOfflineDb();
  await db.delete("clinical_records", id);

  const specialtyKeys = await db.getAllKeysFromIndex("specialty_data", "by_record", id);
  for (const specKey of specialtyKeys) {
    await db.delete("specialty_data", specKey);
  }
}

// ─── Specialty Data ───────────────────────────────────────────────────────────

export async function refreshSpecialtyDataFromRemote(clinicId: string, doctorId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const { data: remoteData, error } = await supabase
      .from("specialty_data")
      .select("*")
      .eq("clinic_id", clinicId)
      .eq("doctor_id", doctorId);

    if (error || !remoteData) return false;

    const pendingIds = await getPendingRecordIds("specialty_data");
    const db = await getOfflineDb();
    
    const typedData = (remoteData as SpecialtyDataRow[]).filter((d) => !pendingIds.has(d.id));
    
    const allLocalRaw = await db.getAll("specialty_data");
    const allLocal = await Promise.all(allLocalRaw.map(unwrapData)) as SpecialtyDataRow[];
    const localForDoctor = allLocal.filter(d => d.doctor_id === doctorId);
    
    const remoteIds = new Set(remoteData.map(d => d.id));
    const idsToDelete = localForDoctor.map(d => d.id).filter(id => !remoteIds.has(id) && !pendingIds.has(id));

    await Promise.all([
      ...typedData.map(async (d) => {
        const wrapped = await wrapData<HceOfflineSchema["specialty_data"]["value"]>(d, {
          id: d.id,
          clinical_record_id: d.clinical_record_id,
          doctor_id: d.doctor_id,
          updated_at: d.updated_at,
        });
      db.put("specialty_data", wrapped);
      }),
      ...idsToDelete.map(id => db.delete("specialty_data", id))
    ]);
    return true;
  } catch {
    return false;
  }
}

export async function saveSpecialtyDataLocal(row: SpecialtyDataRow) {
  // Sync-2.2: Wrap in try/catch + emit sync error, matching savePatientLocal
  // and saveClinicalRecordLocal. Without this, an IDB full/crypto error would
  // propagate silently with no user-visible feedback.
  try {
    const db = await getOfflineDb();
    const wrapped = await wrapData<HceOfflineSchema["specialty_data"]["value"]>(row, {
      id: row.id,
      clinical_record_id: row.clinical_record_id,
      doctor_id: row.doctor_id,
      updated_at: row.updated_at,
    });
    await db.put("specialty_data", wrapped);
  } catch (err) {
    const message = err instanceof Error ? err.message : "IDB write error (specialty_data)";
    emitAppEvent(APP_EVENT_SYNC_ERROR, {
      itemId: row.id,
      tableName: "specialty_data",
      recordId: row.id,
      message: `Error al guardar datos de especialidad localmente: ${message}`,
      retryCount: 0,
    });
    throw err; // Reraise so callers know the write failed
  }
}

// ─── Test Utilities ───────────────────────────────────────────────────────────

export async function clearOfflineDataForTests() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("No se puede borrar IDB en produccion");
  }
  const db = await getOfflineDb();

  await Promise.all([
    db.clear("profiles"),
    db.clear("patients"),
    db.clear("clinical_records"),
    db.clear("specialty_data"),
    db.clear("sync_queue"),
  ]);
}
