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
import WizardStepPatient from "@/features/consultations/components/wizard-step-patient";
import WizardStepAnamnesis from "@/features/consultations/components/wizard-step-anamnesis";
import { WizardStepReviewOfSystems } from "@/features/consultations/components/wizard-step-review-of-systems";
import WizardStepPhysicalExam from "@/features/consultations/components/wizard-step-physical-exam";
import WizardStepDiagnosisOnly from "@/features/consultations/components/wizard-step-diagnosis-only";
import WizardStepTreatment from "@/features/consultations/components/wizard-step-treatment";
import { WizardStepper } from "./wizard-stepper";

// Constante de steps (fuera del componente)
const WIZARD_STEPS = [
  { number: 1, label: "Paciente" },
  { number: 2, label: "Anamnesis" },
  { number: 3, label: "Rev. Sistemas" },
  { number: 4, label: "Examen Físico" },
  { number: 5, label: "Diagnóstico" },
  { number: 6, label: "Tratamiento" },
];

// ─── Step metadata (medico-legal order) — used by WizardStepper internally
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    const pDoc = searchParams?.get("patientDoc");
    const pBirth = searchParams?.get("patientBirth");

    if (aptId && !wizardOpen) {
      openWizard();

      wizard.setForm((prev) => ({
        ...prev,
        appointmentId: aptId,
      }));

      if (pName || pDoc || pBirth) {
        // Buscar coincidencia exacta por cédula
        const existingPatient = pDoc ? wizard.patients.find(p => p.document_number === pDoc) : undefined;

        if (existingPatient) {
          wizard.setForm((prev) => ({
            ...prev,
            patientId: existingPatient.id,
            patientStatus: existingPatient.status ?? "activo",
          }));
        } else {
          // Si no existe, pre-llenar para crear paciente
          const parts = (pName || "").trim().split(" ");
          const firstName = parts[0] || "";
          const lastName = parts.slice(1).join(" ") || "";
          
          setQuickPatient((prev) => ({
            ...prev,
            firstName: firstName || prev.firstName,
            lastName: lastName || prev.lastName,
            documentNumber: pDoc || prev.documentNumber,
            birthDate: pBirth || prev.birthDate,
          }));
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            <div className="mt-5 flex justify-center w-full">
              <WizardStepper steps={WIZARD_STEPS} currentStep={wizard.step} />
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
                  uiPreferences={wizard.uiPreferences}
                />
              </section>

              {/* ── Paso 3: Revisión por Sistemas (Examen Funcional) ────────── */}
              {wizard.uiPreferences?.hide_review_of_systems !== true && (
                <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-ink border-b border-border pb-3">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">3</span>
                    Revisión por Sistemas (Examen Funcional)
                  </h3>
                  <WizardStepReviewOfSystems
                    form={wizard.form}
                    setForm={wizard.setForm}
                    uiPreferences={wizard.uiPreferences}
                    onToggleSection={wizard.toggleSectionVisibility}
                  />
                </section>
              )}

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
                  uiPreferences={wizard.uiPreferences}
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
                  uiPreferences={wizard.uiPreferences}
                  onToggleSection={wizard.toggleSectionVisibility}
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
          {wizard.wizardDraft ? (() => {
            const draftPatient = wizard.patients.find(p => p.id === wizard.wizardDraft?.patientId);
            const draftPatientName = draftPatient ? draftPatient.full_name : "Paciente sin asignar";
            
            return (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink">Consulta Abandonada (Borrador)</h3>
                    <p className="mt-1 text-sm text-ink-soft">
                      Tienes una consulta en curso para <strong>{draftPatientName}</strong>. 
                      ¿Deseas retomarla o descartar el borrador para iniciar una nueva consulta?
                    </p>
                  </div>
                </div>
                <div className="flex w-full md:w-auto gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      wizard.clearWizardDraft();
                      wizard.resetWizard();
                    }}
                    className="hce-btn-secondary flex-1 md:flex-none justify-center border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    Descartar
                  </button>
                  <button
                    type="button"
                    onClick={wizard.resumeWizard}
                    className="hce-btn-primary flex-1 md:flex-none justify-center bg-amber-500 hover:bg-amber-600 border-amber-600"
                  >
                    Retomar consulta
                  </button>
                </div>
              </div>
            );
          })() : (
            <EmptyState
              icon={<EmptyStateIconConsultations />}
              title="Primera consulta del día"
              description="Registra una atención en menos de 3 minutos con el flujo guiado. Los datos se guardan offline y se sincronizan automáticamente."
              size="md"
              action={
                <div className="flex flex-col items-center gap-3">
                  <button
                    type="button"
                    onClick={wizard.openWizard}
                    className="hce-btn-primary"
                  >
                    Nueva consulta
                  </button>
                  <p className="text-xs text-ink-soft">
                    o presiona{" "}
                    <kbd className="inline-flex items-center rounded border border-border bg-bg-soft px-1.5 font-sans text-[10px] font-semibold text-ink-soft">
                      Ctrl+K
                    </kbd>{" "}
                    para buscar un paciente existente
                  </p>
                </div>
              }
            />
          )}
        </div>
      )}
    </section>
  );
}
