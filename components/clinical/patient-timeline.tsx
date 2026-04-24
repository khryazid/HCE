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
      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Timeline clinico por paciente
        </h2>
        <select
          className="w-full max-w-md rounded-xl border border-slate-300 px-3 py-2 text-sm"
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
          <p className="text-sm text-slate-600">
            Aun no hay controles para este paciente.
          </p>
        ) : (
          <div className="space-y-3">
            {timelineRows.map((row) => {
              const data = row.specialty_data as Record<string, unknown>;

              return (
                <article
                  key={row.id}
                  className="rounded-2xl border border-slate-200 p-4 text-sm space-y-1"
                >
                  <p className="font-semibold text-slate-900">
                    {formatTimelineDate(row.updated_at)} ·{" "}
                    {row.specialty_kind}
                  </p>
                  <p className="text-slate-700">
                    {String(data.diagnosis ?? row.chief_complaint)}
                  </p>
                  <p className="text-slate-600">
                    Evolucion:{" "}
                    {String(data.evolution_status ?? "no registrada")}
                  </p>
                  <p className="text-slate-600">
                    Proximo control:{" "}
                    {String(data.next_follow_up_date ?? "sin fecha")}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </article>

      <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Catalogo CIE local (version {CIE_CATALOG[0]?.version})
        </h2>
        <p className="text-sm text-slate-600">
          El catalogo local permite sugerencias rapidas en entorno
          offline-first.
        </p>
      </article>
    </>
  );
}
