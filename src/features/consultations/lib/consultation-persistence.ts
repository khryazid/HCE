import { enqueueSyncItem, saveClinicalRecordLocal, saveSpecialtyDataLocal } from "@/lib/db/indexeddb";
import type { ClinicalRecordRecord, SpecialtyDataRow } from "@/features/consultations/types";

type ConsultationTenant = {
  clinicId: string;
  doctorId: string;
};

export async function persistConsultationLocally(
  tenant: ConsultationTenant,
  record: ClinicalRecordRecord,
  specialtyRow: SpecialtyDataRow,
) {
  // Sync-4.1: Generar hash provisional offline para consultas "selladas"
  // Esto provee integridad de los datos mientras esperan ser sincronizados.
  const payloadToHash = {
    chief_complaint: record.chief_complaint,
    specialty_data: record.specialty_data,
    doctor_id: record.doctor_id,
    patient_id: record.patient_id,
    created_at: record.created_at,
  };
  
  const msgUint8 = new TextEncoder().encode(JSON.stringify(payloadToHash));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const localHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // Guardamos el hash provisional dentro del JSONB de specialty_data
  (record.specialty_data as Record<string, unknown>)._local_offline_hash = localHash;
  (specialtyRow.data as Record<string, unknown>)._local_offline_hash = localHash;

  await saveClinicalRecordLocal(record);
  await saveSpecialtyDataLocal(specialtyRow);

  const clientTimestamp = Date.now();

  await enqueueSyncItem({
    id: crypto.randomUUID(),
    table_name: "clinical_records",
    record_id: record.id,
    action: "upsert",
    payload: record,
    doctor_id: tenant.doctorId,
    clinic_id: tenant.clinicId,
    client_timestamp: clientTimestamp,
    status: "pending",
    retry_count: 0,
  });

  await enqueueSyncItem({
    id: crypto.randomUUID(),
    table_name: "specialty_data",
    record_id: specialtyRow.id,
    action: "upsert",
    payload: specialtyRow,
    doctor_id: tenant.doctorId,
    clinic_id: tenant.clinicId,
    client_timestamp: clientTimestamp,
    status: "pending",
    retry_count: 0,
  });
}