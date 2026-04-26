"use client";

import type { PatientRecord } from "@/types/patient";
import type { WizardForm, PendingFollowUp } from "@/lib/consultations/use-consultation-wizard";

type Props = {
  form: WizardForm;
  patients: PatientRecord[];
  pendingFollowUp: PendingFollowUp | null;
};

export function WizardStepConfirm({ form, patients, pendingFollowUp }: Props) {
  return (
    <div className="hce-surface-soft space-y-3 text-sm text-[color:var(--ink)]">
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>Paciente:</strong>{" "}
        {patients.find((item) => item.id === form.patientId)?.full_name ||
          "No seleccionado"}
      </p>
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>Anamnesis:</strong> {form.anamnesis || "-"}
      </p>
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>Sintomas:</strong> {form.symptoms || "-"}
      </p>
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>Diagnostico:</strong> {form.diagnosis || "-"}
      </p>
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>CIE:</strong> {form.cieCodes || "-"}
      </p>
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>Tipo:</strong>{" "}
        {form.entryMode === "seguimiento" ? "Seguimiento" : "Consulta"}
      </p>
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>Tratamiento:</strong>{" "}
        {form.treatmentPlan || pendingFollowUp?.treatmentPlan || "-"}
      </p>
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>Evolucion:</strong> {form.evolutionStatus || "-"}
      </p>
      <p className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-2">
        <strong>Proximo control:</strong> {form.nextFollowUpDate || "-"}
      </p>
    </div>
  );
}
