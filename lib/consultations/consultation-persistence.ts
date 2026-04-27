import { enqueueSyncItem, saveClinicalRecordLocal, saveSpecialtyDataLocal } from "@/lib/db/indexeddb";
import type { ClinicalRecordRecord, SpecialtyDataRow } from "@/types/consultation";

type ConsultationTenant = {
  clinicId: string;
  doctorId: string;
};

export async function persistConsultationLocally(
  tenant: ConsultationTenant,
  record: ClinicalRecordRecord,
  specialtyRow: SpecialtyDataRow,
) {
  await saveClinicalRecordLocal(record);
  await saveSpecialtyDataLocal(specialtyRow);

  const clientTimestamp = Date.now();

  await enqueueSyncItem({
    id: crypto.randomUUID(),
    table_name: "clinical_records",
    record_id: record.id,
    action: "insert",
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
    action: "insert",
    payload: specialtyRow,
    doctor_id: tenant.doctorId,
    clinic_id: tenant.clinicId,
    client_timestamp: clientTimestamp,
    status: "pending",
    retry_count: 0,
  });
}