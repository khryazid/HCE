"use client";

import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";
import { formatTimelineDate } from "@/lib/consultations/workflow";
import { CIE_CATALOG } from "@/lib/constants/cie-catalog";

type Props = {
  patients: PatientRecord[];
  timelineRows: ClinicalRecordRecord[];
  selectedPatientTimelineId: string;
  onSelectPatient: (id: string) => void;
};

export function PatientTimeline({
  patients,
  timelineRows,
  selectedPatientTimelineId,
  onSelectPatient,
}: Props) {
  return (
    <>
      <article className="hce-surface space-y-4">
        <h2 className="text-lg font-semibold text-ink">
          Timeline clinico por paciente
        </h2>
        <select
          className="hce-input max-w-md"
          value={selectedPatientTimelineId}
          onChange={(event) => onSelectPatient(event.target.value)}
        >
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.full_name} ({patient.document_number})
            </option>
          ))}
        </select>

        {timelineRows.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Aun no hay controles para este paciente.
          </p>
        ) : (
          <div className="space-y-3">
            {timelineRows.map((row) => {
              const data = row.specialty_data as Record<string, unknown>;

              return (
                <article
                  key={row.id}
                  className="hce-card space-y-1"
                >
                  <p className="font-semibold text-ink">
                    {formatTimelineDate(row.updated_at)} ·{" "}
                    {row.specialty_kind}
                  </p>
                  <p className="text-ink">
                    {String(data.diagnosis ?? row.chief_complaint)}
                  </p>
                  <p className="text-ink-soft">
                    Evolucion:{" "}
                    {String(data.evolution_status ?? "no registrada")}
                  </p>
                  <p className="text-ink-soft">
                    Proximo control:{" "}
                    {String(data.next_follow_up_date ?? "sin fecha")}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </article>

      <article className="hce-surface space-y-3 mt-6">
        <h2 className="text-lg font-semibold text-ink">
          Catalogo CIE local (version {CIE_CATALOG[0]?.version})
        </h2>
        <p className="text-sm text-ink-soft">
          El catalogo local permite sugerencias rapidas en entorno
          offline-first.
        </p>
      </article>
    </>
  );
}
