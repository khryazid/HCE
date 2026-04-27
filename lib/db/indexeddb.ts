import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SyncQueueItem, SyncStatus } from "@/types/sync";
import type { PatientRecord, PatientStatus } from "@/types/patient";
import type {
  ClinicalRecordRecord,
  SpecialtyDataRow,
} from "@/types/consultation";
import {
  decryptJson,
  encryptJson,
  isEncryptedEnvelope,
} from "@/lib/db/crypto";
import { getSupabaseClient } from "@/lib/supabase/client";

const DB_NAME = "hce-offline-db";
const DB_VERSION = 1;
const DEFAULT_RETRY_DELAY_MS = 30_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1000;

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
    value: Record<string, unknown>;
    indexes: {
      by_doctor: string;
      by_clinic: string;
      by_updated_at: number;
    };
  };
  clinical_records: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      by_patient: string;
      by_doctor: string;
      by_updated_at: number;
    };
  };
  specialty_data: {
    key: string;
    value: Record<string, unknown>;
    indexes: {
      by_record: string;
      by_doctor: string;
      by_updated_at: number;
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
      upgrade(db) {
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

export async function enqueueSyncItem(item: SyncQueueItem) {
  const db = await getOfflineDb();
  await db.put("sync_queue", {
    ...item,
    table_name_record_id: `${item.table_name}:${item.record_id}`,
    payload: await encryptJson({
      ...item.payload,
      doctor_id: item.doctor_id,
      clinic_id: item.clinic_id,
    }),
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

  const matchingItems = allItems.filter((item) => {
    if (!statuses.includes(item.status)) {
      return false;
    }

    if (options?.includeDelayed) {
      return true;
    }

    return isRetryDue(item, now);
  });

  return Promise.all(
    matchingItems.map(async (item) => ({
      ...item,
      payload: await decryptJson<Record<string, unknown>>(item.payload),
    })),
  );
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

  if (!current) {
    return;
  }

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
    pending: allItems.filter((item) => item.status === "pending").length,
    failed: allItems.filter((item) => item.status === "failed").length,
    abandoned: allItems.filter((item) => item.status === "abandoned").length,
    conflicted: allItems.filter((item) => item.status === "conflicted").length,
  };
}

export async function listSyncQueueItems() {
  const db = await getOfflineDb();
  const allItems = await db.getAll("sync_queue");

  const hydrated = await Promise.all(
    allItems.map(async (item) => ({
      ...item,
      payload: await decryptJson<Record<string, unknown>>(item.payload),
    })),
  );

  return hydrated.sort((first, second) => second.client_timestamp - first.client_timestamp);
}

export async function listPatientsByTenant(clinicId: string) {
  const db = await getOfflineDb();

  try {
    const supabase = getSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const { data: remotePatients, error } = await supabase
        .from("patients")
        .select(
          "id, clinic_id, doctor_id, document_number, full_name, birth_date, status, created_at, updated_at",
        )
        .eq("clinic_id", clinicId);

      type RemotePatientRow = Pick<
        PatientRecord,
        | "id"
        | "clinic_id"
        | "doctor_id"
        | "document_number"
        | "full_name"
        | "birth_date"
        | "status"
        | "created_at"
        | "updated_at"
      >;

      const safeRemotePatients = (remotePatients ?? []) as RemotePatientRow[];

      if (!error && safeRemotePatients.length > 0) {
        await Promise.all(
          safeRemotePatients.map(async (patient) => {
            await db.put("patients", {
              id: patient.id,
              clinic_id: patient.clinic_id,
              doctor_id: patient.doctor_id,
              created_at: patient.created_at,
              updated_at: patient.updated_at,
              payload: await encryptJson({
                document_number: patient.document_number,
                full_name: patient.full_name,
                birth_date: patient.birth_date,
                status: patient.status ?? "activo",
              }),
            });
          }),
        );
      }
    }
  } catch {
    // Offline-first: si el refresco remoto falla, usamos solo la cache local.
  }

  const allPatients = await db.getAll("patients");

  const matchingPatients = allPatients.filter((patient) => patient.clinic_id === clinicId);

  const hydratedPatients = await Promise.all(
    matchingPatients.map(async (patient) => {
      const payload = isEncryptedEnvelope(patient.payload)
        ? await decryptJson<Pick<PatientRecord, "document_number" | "full_name" | "birth_date" | "status">>(
            patient.payload,
          )
        : {
            document_number: patient.document_number,
            full_name: patient.full_name,
            birth_date: patient.birth_date,
            status: patient.status,
          };

      return {
        id: patient.id,
        clinic_id: patient.clinic_id,
        doctor_id: patient.doctor_id,
        document_number: payload.document_number,
        full_name: payload.full_name,
        birth_date: payload.birth_date ?? null,
        status: (payload.status as PatientStatus) ?? "activo",
        created_at: patient.created_at,
        updated_at: patient.updated_at,
      } as PatientRecord;
    }),
  );

  return hydratedPatients.sort((first, second) => second.updated_at.localeCompare(first.updated_at));
}

export async function savePatientLocal(patient: PatientRecord) {
  const db = await getOfflineDb();
  await db.put("patients", {
    id: patient.id,
    clinic_id: patient.clinic_id,
    doctor_id: patient.doctor_id,
    created_at: patient.created_at,
    updated_at: patient.updated_at,
    payload: await encryptJson({
      document_number: patient.document_number,
      full_name: patient.full_name,
      birth_date: patient.birth_date,
      status: patient.status ?? "activo",
    }),
  });
}

export async function deletePatientLocal(id: string) {
  const db = await getOfflineDb();
  await db.delete("patients", id);
}

export async function updatePatientStatusLocal(
  id: string,
  status: PatientStatus,
) {
  const db = await getOfflineDb();
  const existing = await db.get("patients", id);

  if (!existing) {
    return;
  }

  const decrypted = isEncryptedEnvelope(existing.payload)
    ? await decryptJson<Record<string, unknown>>(existing.payload)
    : {
        document_number: existing.document_number,
        full_name: existing.full_name,
        birth_date: existing.birth_date,
        status: existing.status,
      };

  await db.put("patients", {
    ...existing,
    updated_at: new Date().toISOString(),
    payload: await encryptJson({
      ...decrypted,
      status,
    }),
  });
}

export async function listClinicalRecordsByTenant(
  doctorId: string,
  clinicId: string,
) {
  const db = await getOfflineDb();
  const allRecords = await db.getAll("clinical_records");

  const matchingRecords = allRecords.filter(
    (record) => record.doctor_id === doctorId && record.clinic_id === clinicId,
  );

  const hydratedRecords = await Promise.all(
    matchingRecords.map(async (record) => {
      const payload = isEncryptedEnvelope(record.payload)
        ? await decryptJson<{
            chief_complaint: string;
            cie_codes: string[];
            specialty_data: ClinicalRecordRecord["specialty_data"];
          }>(record.payload)
        : {
            chief_complaint: record.chief_complaint,
            cie_codes: record.cie_codes,
            specialty_data: record.specialty_data,
          };

      return {
        id: record.id,
        clinic_id: record.clinic_id,
        doctor_id: record.doctor_id,
        patient_id: record.patient_id,
        chief_complaint: payload.chief_complaint,
        cie_codes: payload.cie_codes,
        specialty_kind: record.specialty_kind,
        specialty_data: payload.specialty_data,
        created_at: record.created_at,
        updated_at: record.updated_at,
      } as ClinicalRecordRecord;
    }),
  );

  return hydratedRecords.sort((first, second) => second.updated_at.localeCompare(first.updated_at));
}

export async function saveClinicalRecordLocal(record: ClinicalRecordRecord) {
  const db = await getOfflineDb();
  await db.put("clinical_records", {
    id: record.id,
    clinic_id: record.clinic_id,
    doctor_id: record.doctor_id,
    patient_id: record.patient_id,
    specialty_kind: record.specialty_kind,
    created_at: record.created_at,
    updated_at: record.updated_at,
    payload: await encryptJson({
      chief_complaint: record.chief_complaint,
      cie_codes: record.cie_codes,
      specialty_data: record.specialty_data,
    }),
  });
}

export async function deleteClinicalRecordLocal(id: string) {
  const db = await getOfflineDb();
  await db.delete("clinical_records", id);
}

export async function saveSpecialtyDataLocal(row: SpecialtyDataRow) {
  const db = await getOfflineDb();
  await db.put("specialty_data", {
    id: row.id,
    clinic_id: row.clinic_id,
    doctor_id: row.doctor_id,
    clinical_record_id: row.clinical_record_id,
    specialty_kind: row.specialty_kind,
    created_at: row.created_at,
    updated_at: row.updated_at,
    payload: await encryptJson({
      data: row.data,
    }),
  });
}

export async function deleteSpecialtyDataLocal(id: string) {
  const db = await getOfflineDb();
  await db.delete("specialty_data", id);
}

export async function clearOfflineDataForTests() {
  const db = await getOfflineDb();

  await Promise.all([
    db.clear("profiles"),
    db.clear("patients"),
    db.clear("clinical_records"),
    db.clear("specialty_data"),
    db.clear("sync_queue"),
  ]);
}
