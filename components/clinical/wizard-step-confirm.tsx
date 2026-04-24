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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-sm text-slate-700">
      <p>
        <strong>Paciente:</strong>{" "}
        {patients.find((item) => item.id === form.patientId)?.full_name ||
          "No seleccionado"}
      </p>
      <p>
        <strong>Anamnesis:</strong> {form.anamnesis || "-"}
      </p>
      <p>
        <strong>Sintomas:</strong> {form.symptoms || "-"}
      </p>
      <p>
        <strong>Diagnostico:</strong> {form.diagnosis || "-"}
      </p>
      <p>
        <strong>CIE:</strong> {form.cieCodes || "-"}
      </p>
      <p>
        <strong>Tipo:</strong>{" "}
        {form.entryMode === "seguimiento" ? "Seguimiento" : "Consulta"}
      </p>
      <p>
        <strong>Tratamiento:</strong>{" "}
        {form.treatmentPlan || pendingFollowUp?.treatmentPlan || "-"}
      </p>
      <p>
        <strong>Evolucion:</strong> {form.evolutionStatus || "-"}
      </p>
      <p>
        <strong>Proximo control:</strong> {form.nextFollowUpDate || "-"}
      </p>
    </div>
  );
}
