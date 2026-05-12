"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useTenant } from "@/lib/supabase/tenant-context";
import { ConsultasSkeleton } from "@/components/ui/skeletons";
import {
  EmptyState,
  EmptyStateIconConsultations,
} from "@/components/ui/empty-state";
import { useConsultationWizard } from "@/features/consultations/lib/use-consultation-wizard";
import { WizardStepPatient } from "@/features/consultations/components/wizard-step-patient";
import { WizardStepAnamnesis } from "@/features/consultations/components/wizard-step-anamnesis";
import { WizardStepReviewOfSystems } from "@/features/consultations/components/wizard-step-review-of-systems";
import { WizardStepPhysicalExam } from "@/features/consultations/components/wizard-step-physical-exam";
import { WizardStepDiagnosisOnly } from "@/features/consultations/components/wizard-step-diagnosis-only";
import { WizardStepTreatment } from "@/features/consultations/components/wizard-step-treatment";

// ─── Step metadata (medico-legal order) ─────────────────────────────────────
const STEPS = [
  { num: 1, label: "Datos del Paciente e Ingreso" },
  { num: 2, label: "Anamnesis y Antecedentes" },
  { num: 3, label: "Revisión por Sistemas" },
  { num: 4, label: "Examen Físico" },
  { num: 5, label: "Diagnóstico" },
  { num: 6, label: "Tratamiento y Plan" },
] as const;

export default function ConsultationsView() {
  const { tenant, loading: tenantLoading } = useTenant();
  const wizard = useConsultationWizard(tenant);
  const searchParams = useSearchParams();

  // Escuchar parámetros de la URL para Iniciar Consulta desde la Agenda
  const { wizardOpen, openWizard, setQuickPatient } = wizard;
  useEffect(() => {
    const aptId = searchParams?.get("appointmentId");
    const pName = searchParams?.get("patientName");

    if (aptId && !wizardOpen) {
      openWizard();

      if (pName) {
        // Separamos el nombre completo de forma simple para pre-llenar "Nuevo paciente"
        const parts = pName.trim().split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";
        
        setQuickPatient((prev) => ({
          ...prev,
          firstName,
          lastName,
        }));
      }
    }
  }, [searchParams, wizardOpen, openWizard, setQuickPatient]);

  if (tenantLoading || wizard.dataLoading) {
    return <ConsultasSkeleton />;
  }

  return (
    <section className="hce-page">

      {/* Header */}
      <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 100% 0%, rgba(15,118,110,0.10) 0%, transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Motor clínico
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
              Flujo de consulta
            </h1>
            <p className="mt-2 text-sm leading-7 text-ink-soft">
              Registro guiado en 6 pasos siguiendo el orden médico-legal estricto.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              import("@/lib/observability/usage-tracker").then((m) => m.trackUsage("consultation:start"));
              wizard.openWizard();
            }}
            className="hce-btn-primary shrink-0"
          >
            Nueva consulta
          </button>
        </div>
      </header>

      {wizard.message ? (
        <div className="hce-alert-success" role="status" aria-live="polite">
          {wizard.message}
        </div>
      ) : null}

      {wizard.error ? (
        <div className="hce-alert-error" role="alert" aria-live="assertive">
          {wizard.error}
        </div>
      ) : null}

      {wizard.wizardOpen ? (
        <article className="space-y-4" spellCheck={true} lang="es">

          {/* Wizard header */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(14,118,110,.08), transparent 45%)",
              }}
            />
            <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-accent">Registro Clínico</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Nueva Consulta</h2>
                <p className="text-sm text-ink-soft">Completa los datos y guarda al finalizar.</p>
              </div>
              <button
                type="button"
                className="hce-btn-secondary shrink-0"
                onClick={wizard.resetWizard}
              >
                Cancelar
              </button>
            </div>

            {/* Stepper visual */}
            <div className="mt-5 flex items-center gap-1 overflow-x-auto pb-1" role="list" aria-label="Pasos del flujo clínico">
              {STEPS.map(({ num, label }, i) => (
                <div key={num} className="flex items-center gap-1 shrink-0" role="listitem">
                  <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-all ${
                    wizard.form.patientId || num === 1
                      ? "bg-teal-500/15 text-teal-800 dark:text-teal-300"
                      : "bg-bg-soft text-ink-soft"
                  }`}>
                    <span className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold ${
                      wizard.form.patientId || num === 1
                        ? "bg-teal-600 text-white"
                        : "bg-border text-ink-soft"
                    }`}>{num}</span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <span aria-hidden className="text-border text-xs">›</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Paso 1: Datos del Paciente e Ingreso ──────────────────────── */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-ink border-b border-border pb-3">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">1</span>
              Datos del Paciente e Ingreso
            </h3>
            <WizardStepPatient
              form={wizard.form}
              setForm={wizard.setForm}
              patients={wizard.patients}
              quickPatient={wizard.quickPatient}
              setQuickPatient={wizard.setQuickPatient}
              pendingFollowUp={wizard.pendingFollowUp}
              latestPatientRecord={wizard.latestPatientRecord}
              validationErrors={wizard.validationErrors}
              tenantSpecialties={tenant?.specialties ?? []}
              onCreateQuickPatient={() => void wizard.createQuickPatient()}
              onApplyConsultaMode={wizard.applyConsultaMode}
              onApplyFollowUpMode={wizard.applyFollowUpMode}
            />
          </section>

          {wizard.form.patientId ? (
            <>
              {/* ── Paso 2: Anamnesis y Antecedentes ──────────────────────── */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-ink border-b border-border pb-3">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">2</span>
                  Anamnesis y Antecedentes
                </h3>
                <WizardStepAnamnesis
                  form={wizard.form}
                  setForm={wizard.setForm}
                  validationErrors={wizard.validationErrors}
                />
              </section>

              {/* ── Paso 3: Revisión por Sistemas (Examen Funcional) ────────── */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-ink border-b border-border pb-3">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">3</span>
                  Revisión por Sistemas (Examen Funcional)
                </h3>
                <WizardStepReviewOfSystems
                  form={wizard.form}
                  setForm={wizard.setForm}
                />
              </section>

              {/* ── Paso 4: Examen Físico ──────────────────────────────────── */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-ink border-b border-border pb-3">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">4</span>
                  Examen Físico
                </h3>
                <WizardStepPhysicalExam
                  form={wizard.form}
                  setForm={wizard.setForm}
                  tenantSpecialties={tenant?.specialties ?? []}
                />
              </section>

              {/* ── Paso 5: Diagnóstico ───────────────────────────────────── */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-ink border-b border-border pb-3">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">5</span>
                  Diagnóstico
                </h3>
                <WizardStepDiagnosisOnly
                  form={wizard.form}
                  setForm={wizard.setForm}
                  validationErrors={wizard.validationErrors}
                  triggerMagicCieFill={wizard.triggerMagicCieFill}
                />
              </section>

              {/* ── Paso 6: Tratamiento y Plan ────────────────────────────── */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-ink border-b border-border pb-3">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">6</span>
                  Tratamiento y Plan
                </h3>
                <WizardStepTreatment
                  form={wizard.form}
                  setForm={wizard.setForm}
                  templates={wizard.templates}
                  validationErrors={wizard.validationErrors}
                  latestPatientRecord={wizard.latestPatientRecord}
                  onApplyTemplate={wizard.applyTemplate}
                />
              </section>

              {/* Action bar */}
              <div className="hce-sticky-action-bar flex flex-col sm:flex-row gap-4 items-center justify-between pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:pb-4">
                <div>
                  <p className="font-bold text-ink">Consulta lista para guardar</p>
                  <p className="text-xs text-ink-soft">Revisa los datos antes de continuar.</p>
                </div>
                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => void wizard.handleSaveWithoutPdf()}
                    className="hce-btn-secondary flex-1 sm:flex-none justify-center"
                    disabled={wizard.saving}
                  >
                    {wizard.saving ? "Guardando..." : "Solo guardar"}
                  </button>
                  <button
                    onClick={() => void wizard.handleSaveWithPdf()}
                    className="hce-btn-primary flex-1 sm:flex-none justify-center"
                    disabled={wizard.saving}
                  >
                    Guardar y Generar PDF
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-border bg-card p-6 text-center shadow-sm">
              <p className="text-ink-soft">Selecciona o crea un paciente para continuar con la consulta.</p>
            </div>
          )}
        </article>
      ) : (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <EmptyState
            icon={<EmptyStateIconConsultations />}
            title="Listo para registrar una atención"
            description="Inicia el flujo guiado para crear una nueva consulta o seguimiento. Los datos se guardan offline y se sincronizan al recuperar conexión."
            size="md"
            action={
              <button
                type="button"
                onClick={wizard.openWizard}
                className="hce-btn-primary"
              >
                Nueva consulta
              </button>
            }
          />
        </div>
      )}
    </section>
  );
}
