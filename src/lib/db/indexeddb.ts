import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SyncQueueItem, SyncStatus } from "@/types/sync";
import type { PatientRecord, PatientStatus } from "@/features/patients/types";
import type {
  ClinicalRecordRecord,
  SpecialtyDataRow,
} from "@/features/consultations/types";
import { getSupabaseClient } from "@/lib/supabase/client";
import { MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS } from "@/lib/constants/sync";

/**
 * Opción B de cifrado: sin cifrado local de PHI.
 * Los datos se almacenan en texto plano en IndexedDB.
 * La seguridad está garantizada por autenticación + RLS en Supabase + HTTPS.
 * Esto permite multidevice transparente sin gestión de claves por el usuario.
 */

const DB_NAME = "hce-offline-db";
const DB_VERSION = 2; // Bump de versión para migrar de payload cifrado a plano
const DEFAULT_RETRY_DELAY_MS = BASE_RETRY_DELAY_MS;

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

let dbPromise: Promise<IDBPDatabase<HceOfflineSchema>> | null = null;

export function getOfflineDb() {
  if (!dbPromise) {
    dbPromise = openDB<HceOfflineSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 → v2: recrea todos los stores sin payload cifrado.
        // Los datos locales cifrados de v1 no son migrables (requieren la clave),
        // así que los descartamos. Los datos canónicos viven en Supabase y se
        // vuelven a descargar en la próxima carga online.
        if (oldVersion < 2) {
          const stores = ["profiles", "patients", "clinical_records", "specialty_data", "sync_queue"] as const;
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
  const db = await getOfflineDb();
  await db.put("sync_queue", {
    ...item,
    table_name_record_id: `${item.table_name}:${item.record_id}`,
    payload: {
      ...item.payload,
      doctor_id: item.doctor_id,
      clinic_id: item.clinic_id,
    },
    next_retry_at: item.next_retry_at ?? Date.now(),
  });
}

function isRetryDue(item: SyncQueueItem, now: number) {
  return typeof item.next_retry_at !== "number" || item.next_retry_at <= now;
}

export async function getSyncQueueItemsByStatus(
  statuses: SyncStatus[],
  options?: { includeDelayed?: boolean },
) {
  const db = await getOfflineDb();
  const allItems = await db.getAll("sync_queue");
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
  const current = await db.get("sync_queue", id);

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

  await db.put("sync_queue", {
    ...current,
    status,
    retry_count: retryCount,
    last_error: lastError,
    next_retry_at: nextRetryAt,
  });
}

export async function deleteSyncQueueItem(id: string) {
  const db = await getOfflineDb();
  await db.delete("sync_queue", id);
}

export async function getSyncQueueStats() {
  const db = await getOfflineDb();
  const allItems = await db.getAll("sync_queue");

  return {
    pending: allItems.filter((i) => i.status === "pending").length,
    failed: allItems.filter((i) => i.status === "failed").length,
    abandoned: allItems.filter((i) => i.status === "abandoned").length,
    conflicted: allItems.filter((i) => i.status === "conflicted").length,
  };
}

export async function listSyncQueueItems() {
  const db = await getOfflineDb();
  const allItems = await db.getAll("sync_queue");
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
  const allItems = await db.getAll("sync_queue");

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

// ─── Patients ─────────────────────────────────────────────────────────────────

/**
 * Helper to prevent remote refresh from overwriting local un-synced changes
 * or resurrecting locally deleted items.
 */
async function getPendingRecordIds(tableName: string): Promise<Set<string>> {
  const db = await getOfflineDb();
  const allItems = await db.getAll("sync_queue");
  const pendingIds = new Set<string>();
  for (const item of allItems) {
    if (item.table_name === tableName && (item.status === "pending" || item.status === "failed")) {
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

    if (error || !remotePatients || remotePatients.length === 0) return false;

    const pendingIds = await getPendingRecordIds("patients");
    const db = await getOfflineDb();
    
    const typedPatients = (remotePatients as PatientRecord[]).filter((p) => !pendingIds.has(p.id));
    
    await Promise.all(
      typedPatients.map((patient) =>
        db.put("patients", {
          id: patient.id,
          clinic_id: patient.clinic_id,
          doctor_id: patient.doctor_id,
          document_number: patient.document_number,
          full_name: patient.full_name,
          birth_date: patient.birth_date ?? null,
          status: (patient.status as PatientStatus) ?? "activo",
          created_at: patient.created_at,
          updated_at: patient.updated_at,
        }),
      ),
    );
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
  const allPatients = await db.getAll("patients");
  return allPatients
    .filter((p) => p.clinic_id === clinicId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)) as PatientRecord[];
}

export async function savePatientLocal(patient: PatientRecord) {
  const db = await getOfflineDb();
  await db.put("patients", {
    id: patient.id,
    clinic_id: patient.clinic_id,
    doctor_id: patient.doctor_id,
    document_number: patient.document_number,
    full_name: patient.full_name,
    birth_date: patient.birth_date ?? null,
    status: patient.status ?? "activo",
    created_at: patient.created_at,
    updated_at: patient.updated_at,
  });
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
  const existing = await db.get("patients", id);
  if (!existing) return;

  await db.put("patients", {
    ...existing,
    status,
    updated_at: new Date().toISOString(),
  });
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

    if (error || !remoteRecords || remoteRecords.length === 0) return false;

    const pendingIds = await getPendingRecordIds("clinical_records");
    const db = await getOfflineDb();
    
    const typedRecords = (remoteRecords as ClinicalRecordRecord[]).filter((r) => !pendingIds.has(r.id));
    
    await Promise.all(
      typedRecords.map((r) => db.put("clinical_records", r))
    );
    return true;
  } catch {
    return false;
  }
}

export async function listClinicalRecordsByTenant(doctorId: string, clinicId: string) {
  const db = await getOfflineDb();
  const allRecords = await db.getAll("clinical_records");

  return allRecords
    .filter((r) => r.doctor_id === doctorId && r.clinic_id === clinicId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at)) as ClinicalRecordRecord[];
}

export async function saveClinicalRecordLocal(record: ClinicalRecordRecord) {
  const db = await getOfflineDb();
  await db.put("clinical_records", {
    id: record.id,
    clinic_id: record.clinic_id,
    doctor_id: record.doctor_id,
    patient_id: record.patient_id,
    specialty_kind: record.specialty_kind,
    chief_complaint: record.chief_complaint,
    cie_codes: record.cie_codes,
    specialty_data: record.specialty_data,
    created_at: record.created_at,
    updated_at: record.updated_at,
  });
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

    if (error || !remoteData || remoteData.length === 0) return false;

    const pendingIds = await getPendingRecordIds("specialty_data");
    const db = await getOfflineDb();
    
    const typedData = (remoteData as SpecialtyDataRow[]).filter((d) => !pendingIds.has(d.id));
    
    await Promise.all(
      typedData.map((d) => db.put("specialty_data", d))
    );
    return true;
  } catch {
    return false;
  }
}

export async function saveSpecialtyDataLocal(row: SpecialtyDataRow) {
  const db = await getOfflineDb();
  await db.put("specialty_data", {
    id: row.id,
    clinic_id: row.clinic_id,
    doctor_id: row.doctor_id,
    clinical_record_id: row.clinical_record_id,
    specialty_kind: row.specialty_kind,
    data: row.data,
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
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
