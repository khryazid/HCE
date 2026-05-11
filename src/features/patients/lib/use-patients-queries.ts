import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listPatientsByTenant,
  refreshPatientsFromRemote,
  listClinicalRecordsByTenant,
  updatePatientStatusLocal,
  deletePatientLocal,
  deleteClinicalRecordLocal,
  enqueueSyncItem,
  refreshClinicalRecordsFromRemote,
  refreshSpecialtyDataFromRemote,
} from "@/lib/db/indexeddb";
import type { PatientRecord, PatientStatus } from "@/features/patients/types";
import type { ClinicalRecordRecord } from "@/features/consultations/types";
import type { TenantProfile } from "@/lib/supabase/profile";

// Keys para caché
export const patientKeys = {
  all: ["patients"] as const,
  tenant: (clinicId: string) => ["patients", clinicId] as const,
};

export const recordKeys = {
  all: ["clinical_records"] as const,
  tenant: (clinicId: string) => ["clinical_records", clinicId] as const,
};

export function usePatients(tenant: TenantProfile | null) {
  return useQuery({
    queryKey: patientKeys.tenant(tenant?.clinic_id ?? ""),
    queryFn: async () => {
      // Refresh from remote first (no-op if offline or session expired),
      // then read from local IDB — works in both online and offline mode.
      await refreshPatientsFromRemote(tenant!.clinic_id);
      return listPatientsByTenant(tenant!.clinic_id);
    },
    enabled: !!tenant,
  });
}

export function useClinicalRecords(tenant: TenantProfile | null) {
  return useQuery({
    queryKey: recordKeys.tenant(tenant?.clinic_id ?? ""),
    queryFn: async () => {
      // First refresh data from remote
      await refreshClinicalRecordsFromRemote(tenant!.clinic_id, tenant!.doctor_id);
      await refreshSpecialtyDataFromRemote(tenant!.clinic_id, tenant!.doctor_id);
      // Then return from local IDB
      return listClinicalRecordsByTenant(tenant!.doctor_id, tenant!.clinic_id);
    },
    enabled: !!tenant,
  });
}

export function useUpdatePatientStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patient,
      nextStatus,
      tenant,
    }: {
      patient: PatientRecord;
      nextStatus: PatientStatus;
      tenant: TenantProfile;
    }) => {
      const updatedAt = new Date().toISOString();
      const updatedPatient: PatientRecord = { ...patient, status: nextStatus, updated_at: updatedAt };

      await updatePatientStatusLocal(patient.id, nextStatus);
      await enqueueSyncItem({
        id: crypto.randomUUID(),
        table_name: "patients",
        record_id: patient.id,
        action: "update",
        payload: updatedPatient,
        doctor_id: tenant.doctor_id,
        clinic_id: tenant.clinic_id,
        client_timestamp: Date.now(),
        status: "pending",
        retry_count: 0,
      });

      return updatedPatient;
    },
    onSuccess: (updatedPatient, { tenant }) => {
      queryClient.setQueryData(patientKeys.tenant(tenant.clinic_id), (old: PatientRecord[] | undefined) => {
        if (!old) return [];
        return old.map((p) => (p.id === updatedPatient.id ? updatedPatient : p));
      });
    },
  });
}

export function useDeletePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      patient,
      records,
      tenant,
      onProgress,
    }: {
      patient: PatientRecord;
      records: ClinicalRecordRecord[];
      tenant: TenantProfile;
      onProgress: (label: string, done: number, total: number) => void;
    }) => {
      const patientRecords = records.filter((r) => r.patient_id === patient.id);
      const totalSteps = patientRecords.length + 1;
      let done = 0;

      for (const rec of patientRecords) {
        done++;
        onProgress(`Eliminando consulta ${done} de ${patientRecords.length}…`, done, totalSteps);
        
        await deleteClinicalRecordLocal(rec.id);
        await enqueueSyncItem({
          id: crypto.randomUUID(),
          table_name: "clinical_records",
          record_id: rec.id,
          action: "delete",
          payload: { id: rec.id },
          doctor_id: tenant.doctor_id,
          clinic_id: tenant.clinic_id,
          client_timestamp: Date.now(),
          status: "pending",
          retry_count: 0,
        });
      }

      done++;
      onProgress("Eliminando datos del paciente…", done, totalSteps);
      await deletePatientLocal(patient.id);
      await enqueueSyncItem({
        id: crypto.randomUUID(),
        table_name: "patients",
        record_id: patient.id,
        action: "delete",
        payload: { id: patient.id },
        doctor_id: tenant.doctor_id,
        clinic_id: tenant.clinic_id,
        client_timestamp: Date.now(),
        status: "pending",
        retry_count: 0,
      });

      return { patientId: patient.id, recordIds: patientRecords.map((r) => r.id) };
    },
    onSuccess: ({ patientId, recordIds }, { tenant }) => {
      queryClient.setQueryData(patientKeys.tenant(tenant.clinic_id), (old: PatientRecord[] | undefined) => {
        if (!old) return [];
        return old.filter((p) => p.id !== patientId);
      });
      queryClient.setQueryData(recordKeys.tenant(tenant.clinic_id), (old: ClinicalRecordRecord[] | undefined) => {
        if (!old) return [];
        return old.filter((r) => !recordIds.includes(r.id));
      });
    },
  });
}

export function useDeleteClinicalRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      recordId,
      tenant,
    }: {
      recordId: string;
      tenant: TenantProfile;
    }) => {
      await deleteClinicalRecordLocal(recordId);
      await enqueueSyncItem({
        id: crypto.randomUUID(),
        table_name: "clinical_records",
        record_id: recordId,
        action: "delete",
        payload: { id: recordId },
        doctor_id: tenant.doctor_id,
        clinic_id: tenant.clinic_id,
        client_timestamp: Date.now(),
        status: "pending",
        retry_count: 0,
      });

      return recordId;
    },
    onSuccess: (recordId, { tenant }) => {
      queryClient.setQueryData(recordKeys.tenant(tenant.clinic_id), (old: ClinicalRecordRecord[] | undefined) => {
        if (!old) return [];
        return old.filter((r) => r.id !== recordId);
      });
    },
  });
}
