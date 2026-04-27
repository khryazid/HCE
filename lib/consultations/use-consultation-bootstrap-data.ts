"use client";

import { useEffect } from "react";
import type { TenantProfile } from "@/lib/supabase/profile";
import { listClinicalRecordsByTenant, listPatientsByTenant } from "@/lib/db/indexeddb";
import {
  listTreatmentTemplates,
  type TreatmentTemplate,
} from "@/lib/local-data/treatments";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";

type Params = {
  tenant: TenantProfile | null;
  setPatients: (value: PatientRecord[]) => void;
  setRecords: (value: ClinicalRecordRecord[]) => void;
  setTemplates: (value: TreatmentTemplate[]) => void;
  setSelectedPatientTimelineId: (value: string) => void;
  setDataLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
};

export function useConsultationBootstrapData({
  tenant,
  setPatients,
  setRecords,
  setTemplates,
  setSelectedPatientTimelineId,
  setDataLoading,
  setError,
}: Params) {
  useEffect(() => {
    if (!tenant) {
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const [patientRows, consultationRows] = await Promise.all([
          listPatientsByTenant(tenant.clinic_id),
          listClinicalRecordsByTenant(tenant.doctor_id, tenant.clinic_id),
        ]);

        if (!active) {
          return;
        }

        setPatients(patientRows);
        setRecords(consultationRows);
        setTemplates(listTreatmentTemplates(tenant.doctor_id, tenant.clinic_id));
        setSelectedPatientTimelineId(patientRows[0]?.id ?? "");
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No se pudo cargar consultas.",
          );
        }
      } finally {
        if (active) {
          setDataLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [
    setDataLoading,
    setError,
    setPatients,
    setRecords,
    setSelectedPatientTimelineId,
    setTemplates,
    tenant,
  ]);
}