"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadTenantProfile } from "@/lib/supabase/profile";
import { listClinicalRecordsByTenant, listPatientsByTenant } from "@/lib/db/indexeddb";
import type { ClinicalRecordRecord } from "@/types/consultation";
import type { PatientRecord } from "@/types/patient";

function formatDate(value: string) {
  return new Date(value).toLocaleString("es-EC");
}

function getTextField(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function getNullableDate(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

type PatientHistoryDetails = {
  consultationDate: string;
  anamnesis: string;
  symptoms: string;
  diagnosis: string;
  treatmentPlan: string;
  evolutionStatus: string;
  nextFollowUpDate: string | null;
  isFollowUpOverdue: boolean;
  cieCodes: string[];
};

function getHistoryDetails(record: ClinicalRecordRecord): PatientHistoryDetails {
  const specialtyData = record.specialty_data as Record<string, unknown>;
  const nextFollowUpDate = getNullableDate(specialtyData.next_follow_up_date);

  return {
    consultationDate: record.created_at,
    anamnesis: getTextField(specialtyData.anamnesis, record.chief_complaint),
    symptoms: getTextField(specialtyData.symptoms, "Sin sintomas registrados"),
    diagnosis: getTextField(specialtyData.diagnosis, "Sin diagnostico registrado"),
    treatmentPlan: getTextField(specialtyData.treatment_plan, "Sin tratamiento registrado"),
    evolutionStatus: getTextField(specialtyData.evolution_status, "Sin evolucion registrada"),
    nextFollowUpDate,
    isFollowUpOverdue: nextFollowUpDate ? new Date(nextFollowUpDate).getTime() < Date.now() : false,
    cieCodes: record.cie_codes,
  };
}

export default function PacientesPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [records, setRecords] = useState<ClinicalRecordRecord[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [selectedRecordId, setSelectedRecordId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const tenantProfile = await loadTenantProfile(session.user.id);

        if (!tenantProfile) {
          throw new Error("No se encontro perfil de tenant para este usuario.");
        }

        const localPatients = await listPatientsByTenant(
          tenantProfile.doctor_id,
          tenantProfile.clinic_id,
        );
        const localRecords = await listClinicalRecordsByTenant(
          tenantProfile.doctor_id,
          tenantProfile.clinic_id,
        );

        if (!active) {
          return;
        }

        setPatients(localPatients);
        setRecords(localRecords);
        setSelectedPatientId(localPatients[0]?.id ?? "");
      } catch (bootstrapError) {
        if (active) {
          setError(
            bootstrapError instanceof Error
              ? bootstrapError.message
              : "No se pudo cargar pacientes.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  const filteredPatients = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    if (!normalized) {
      return patients;
    }

    return patients.filter((patient) => {
      return (
        patient.full_name.toLowerCase().includes(normalized) ||
        patient.document_number.toLowerCase().includes(normalized)
      );
    });
  }, [patients, search]);

  useEffect(() => {
    if (!filteredPatients.some((patient) => patient.id === selectedPatientId)) {
      setSelectedPatientId(filteredPatients[0]?.id ?? "");
    }
  }, [filteredPatients, selectedPatientId]);

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === selectedPatientId) ?? null,
    [patients, selectedPatientId],
  );

  const patientHistory = useMemo(() => {
    if (!selectedPatient) {
      return [];
    }

    return records
      .filter((record) => record.patient_id === selectedPatient.id)
      .sort((first, second) => second.updated_at.localeCompare(first.updated_at));
  }, [records, selectedPatient]);

  useEffect(() => {
    if (!patientHistory.some((record) => record.id === selectedRecordId)) {
      setSelectedRecordId(patientHistory[0]?.id ?? "");
    }
  }, [patientHistory, selectedRecordId]);

  const selectedRecord = useMemo(
    () => patientHistory.find((record) => record.id === selectedRecordId) ?? patientHistory[0] ?? null,
    [patientHistory, selectedRecordId],
  );

  const selectedDetails = selectedRecord ? getHistoryDetails(selectedRecord) : null;
  const followUpRecords = patientHistory.filter((record) => getHistoryDetails(record).nextFollowUpDate);
  const overdueFollowUps = followUpRecords.filter((record) => getHistoryDetails(record).isFollowUpOverdue);

  if (loading) {
    return <p className="text-sm text-slate-600">Cargando pacientes...</p>;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Historial de pacientes
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">Pacientes</h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-700">
              Aqui ves el historial de consultas y seguimientos por paciente. El alta de pacientes
              se hace desde Consultas para mantener un solo flujo de ingreso.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/consultas"
              className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800"
            >
              Crear consulta / paciente
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
            >
              Volver al panel
            </Link>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Pacientes registrados
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{patients.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Consultas del paciente
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{patientHistory.length}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Seguimientos pendientes
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{overdueFollowUps.length}</p>
        </article>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pacientes</h2>
              <p className="text-sm text-slate-600">Selecciona un paciente para revisar su historial.</p>
            </div>
            <label className="block space-y-2 text-sm font-medium text-slate-700">
              <span>Buscar</span>
              <input
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-teal-600 focus:ring-2"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o documento"
              />
            </label>
          </div>

          <div className="mt-4 space-y-2">
            {filteredPatients.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No hay pacientes que coincidan con tu busqueda.
              </div>
            ) : (
              filteredPatients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => setSelectedPatientId(patient.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition hover:bg-slate-50 ${
                    selectedPatientId === patient.id
                      ? "border-teal-300 bg-teal-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="font-semibold text-slate-900">{patient.full_name}</p>
                  <p className="text-sm text-slate-600">{patient.document_number}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {patient.birth_date ? `Nacimiento: ${patient.birth_date}` : "Sin fecha de nacimiento"}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <section className="space-y-6">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Perfil del paciente
                </p>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {selectedPatient ? selectedPatient.full_name : "Selecciona un paciente"}
                </h2>
                <p className="text-sm text-slate-700">
                  {selectedPatient
                    ? `${selectedPatient.document_number}${selectedPatient.birth_date ? ` · ${selectedPatient.birth_date}` : ""}`
                    : "Aquí verás los datos generales y su historia clínica."}
                </p>
              </div>

              {selectedPatient ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Consultas</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{patientHistory.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.15em] text-slate-500">Seguimientos</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{followUpRecords.length}</p>
                  </div>
                </div>
              ) : null}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Historial de consultas</h2>
                <p className="text-sm text-slate-600">
                  Cada tarjeta es clicable para revisar el detalle de anamnesis, tratamiento y seguimiento.
                </p>
              </div>
              <Link
                href="/consultas"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Nueva consulta
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {patientHistory.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                  Aun no hay consultas para este paciente.
                </div>
              ) : (
                patientHistory.map((record) => {
                  const details = getHistoryDetails(record);
                  const isSelected = selectedRecord?.id === record.id;

                  return (
                    <article
                      key={record.id}
                      className={`w-full rounded-2xl border p-4 ${
                        isSelected ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedRecordId(record.id)}
                        className="w-full text-left transition hover:bg-slate-50"
                      >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {record.specialty_kind} · {formatDate(details.consultationDate)}
                          </p>
                          <p className="mt-1 text-sm text-slate-700">{details.diagnosis}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600">
                          {details.nextFollowUpDate ? (details.isFollowUpOverdue ? "Seguimiento vencido" : "Con seguimiento") : "Sin seguimiento"}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Anamnesis</p>
                          <p className="mt-1 text-sm text-slate-700">{details.anamnesis}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Tratamiento</p>
                          <p className="mt-1 text-sm text-slate-700">{details.treatmentPlan}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
                        {details.cieCodes.map((code) => (
                          <span key={code} className="rounded-full bg-slate-100 px-2.5 py-1">
                            {code}
                          </span>
                        ))}
                      </div>

                      </button>
                      <div className="mt-3">
                        <Link
                          href={`/consultas?mode=seguimiento&patientId=${record.patient_id}&recordId=${record.id}`}
                          className="inline-flex rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-900 transition hover:bg-teal-100"
                        >
                          Crear seguimiento desde esta consulta
                        </Link>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Detalle del seguimiento</h2>
            {selectedDetails ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-900">Fecha:</span> {formatDate(selectedDetails.consultationDate)}</p>
                  <p><span className="font-semibold text-slate-900">Sintomas:</span> {selectedDetails.symptoms}</p>
                  <p><span className="font-semibold text-slate-900">Diagnostico:</span> {selectedDetails.diagnosis}</p>
                  <p><span className="font-semibold text-slate-900">Evolucion:</span> {selectedDetails.evolutionStatus}</p>
                  <p><span className="font-semibold text-slate-900">Proximo control:</span> {selectedDetails.nextFollowUpDate ?? "No programado"}</p>
                </div>
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Acciones</p>
                  <Link
                    href="/consultas"
                    className="inline-flex rounded-xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800"
                  >
                    Registrar nueva consulta o seguimiento
                  </Link>
                  <p className="text-sm text-slate-700">
                    El paciente se crea y actualiza desde Consultas. En esta vista solo revisas su historia y controlas el seguimiento.
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Selecciona una consulta para ver el detalle del seguimiento.
              </p>
            )}
          </article>
        </section>
      </div>
    </section>
  );
}
