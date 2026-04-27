"use client";

import { useEffect } from "react";
import type { MutableRefObject } from "react";
import type { ClinicalRecordRecord } from "@/types/consultation";
import {
  buildDeepLinkFollowUpFormState,
  type DeepLinkFollowUpEditableFields,
} from "@/lib/consultations/wizard-domain";

type Params<TForm extends DeepLinkFollowUpEditableFields> = {
  dataLoading: boolean;
  records: ClinicalRecordRecord[];
  setForm: (updater: (current: TForm) => TForm) => void;
  setStep: (step: number) => void;
  setWizardOpen: (open: boolean) => void;
  setError: (message: string | null) => void;
  setMessage: (message: string | null) => void;
  replaceRoute: (href: string) => void;
  deepLinkHandledRef: MutableRefObject<boolean>;
};

export function useFollowUpDeepLink<TForm extends DeepLinkFollowUpEditableFields>({
  dataLoading,
  records,
  setForm,
  setStep,
  setWizardOpen,
  setError,
  setMessage,
  replaceRoute,
  deepLinkHandledRef,
}: Params<TForm>) {
  useEffect(() => {
    if (dataLoading || deepLinkHandledRef.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);

    const mode = urlParams.get("mode");
    const patientId = urlParams.get("patientId");
    const recordId = urlParams.get("recordId");

    if (mode !== "seguimiento" || !patientId || !recordId) {
      return;
    }

    const linkedRecord = records.find(
      (record) => record.id === recordId && record.patient_id === patientId,
    );

    if (!linkedRecord) {
      deepLinkHandledRef.current = true;
      return;
    }

    setForm((current) =>
      buildDeepLinkFollowUpFormState(current, {
        patientId,
        record: linkedRecord,
      }),
    );
    setStep(2);
    setWizardOpen(true);
    setError(null);
    setMessage("Seguimiento precargado desde historial.");
    deepLinkHandledRef.current = true;
    replaceRoute("/consultas");
  }, [
    dataLoading,
    deepLinkHandledRef,
    records,
    replaceRoute,
    setError,
    setForm,
    setMessage,
    setStep,
    setWizardOpen,
  ]);
}