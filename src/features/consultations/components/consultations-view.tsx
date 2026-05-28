"use client";

import { useEffect, useState } from "react";
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
import "./consultations.css";

// ─── Step metadata
const STEPS = [
  { id: "step-1", num: 1, label: "Datos del Paciente e Ingreso" },
  { id: "step-2", num: 2, label: "Anamnesis y Antecedentes" },
  { id: "step-3", num: 3, label: "Revisión por Sistemas" },
  { id: "step-4", num: 4, label: "Examen Físico" },
  { id: "step-5", num: 5, label: "Diagnóstico" },
  { id: "step-6", num: 6, label: "Tratamiento y Plan" },
] as const;

export default function ConsultationsView() {
  const { tenant, loading: tenantLoading } = useTenant();
  const wizard = useConsultationWizard(tenant);
  const searchParams = useSearchParams();
  const [activeStepId, setActiveStepId] = useState<string>("step-1");

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
        const existingPatient = pDoc ? wizard.patients.find(p => p.document_number === pDoc) : undefined;

        if (existingPatient) {
          wizard.setForm((prev) => ({
            ...prev,
            patientId: existingPatient.id,
            patientStatus: existingPatient.status ?? "activo",
          }));
        } else {
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

  // Scroll-spy para el índice lateral
  useEffect(() => {
    if (!wizard.wizardOpen) return;
    
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      if (timeoutId) clearTimeout(timeoutId);
      
      timeoutId = setTimeout(() => {
        const offset = 250; // Compensación para headers y visualización
        const scrollPosition = window.scrollY + offset;

        let currentActive = "step-1";
        
        for (const step of STEPS) {
          const el = document.getElementById(step.id);
          if (el) {
            const top = el.getBoundingClientRect().top + window.scrollY;
            if (scrollPosition >= top) {
              currentActive = step.id;
            }
          }
        }
        
        setActiveStepId((prev) => (prev !== currentActive ? currentActive : prev));
      }, 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Llamada inicial para fijar el activo correcto al abrir
    setTimeout(handleScroll, 100);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [wizard.wizardOpen]);

  const scrollToStep = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  if (tenantLoading || wizard.dataLoading) {
    return <ConsultasSkeleton />;
  }

  return (
    <section className="hce-page pb-24">

      {/* Header */}
      {!wizard.wizardOpen && (
        <header className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 mb-6">
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
                Registro guiado siguiendo el orden médico-legal estricto.
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
      )}

      {wizard.message ? (
        <div className="hce-alert-success mb-6" role="status" aria-live="polite">
          {wizard.message}
        </div>
      ) : null}

      {wizard.error ? (
        <div className="hce-alert-error mb-6" role="alert" aria-live="assertive">
          {wizard.error}
        </div>
      ) : null}

      {wizard.wizardOpen ? (
        <article spellCheck={true} lang="es">
          
          {/* Header minimalista cuando el wizard está abierto */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 pb-4 border-b border-border">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent">Registro Clínico</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-ink">Nueva Consulta</h2>
            </div>
            <button
              type="button"
              className="hce-btn-secondary shrink-0 mt-4 sm:mt-0 text-sm"
              onClick={wizard.resetWizard}
            >
              Cancelar Consulta
            </button>
          </div>

          <div className="gx-consultation-layout">
            
            {/* ÍNDICE LATERAL (STICKY) */}
            <aside className="gx-consultation-index">
              <nav className="space-y-1">
                {STEPS.map((step) => {
                  const isActive = activeStepId === step.id;
                  const isDone = false; // TODO: Implementar lógica de validación parcial si se desea

                  // Ocultar sección 3 si el usuario prefirió ocultarla
                  if (step.id === "step-3" && wizard.uiPreferences?.hide_review_of_systems) {
                    return null;
                  }

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => scrollToStep(step.id)}
                      className="gx-index-item w-full text-left"
                      data-active={isActive}
                      data-done={isDone}
                    >
                      <span className="gx-index-num">{step.num}</span>
                      <span className="truncate">{step.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* ACTION BAR FLOTANTE INTEGRADA EN EL ÍNDICE */}
              {wizard.form.patientId && (
                <div className="gx-floating-actions">
                  <p className="text-xs font-bold text-ink mb-3">Acciones</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => void wizard.handleSaveWithoutPdf()}
                      className="hce-btn-secondary w-full justify-center text-xs py-2"
                      disabled={wizard.saving}
                    >
                      {wizard.saving ? "Guardando..." : "Solo Guardar"}
                    </button>
                    <button
                      onClick={() => void wizard.handleSaveWithPdf()}
                      className="hce-btn-primary w-full justify-center text-xs py-2"
                      disabled={wizard.saving}
                    >
                      Guardar y PDF
                    </button>
                  </div>
                </div>
              )}
            </aside>

            {/* LIENZO CLÍNICO CONTINUO */}
            <div className="gx-form-canvas bg-card rounded-2xl sm:rounded-none sm:bg-transparent p-4 sm:p-0 shadow-sm sm:shadow-none border border-border sm:border-none">
              
              {/* ── Paso 1: Datos del Paciente e Ingreso ──────────────────────── */}
              <section id="step-1" className="gx-form-section pt-0">
                <h3 className="gx-form-section-title">
                  <span>1</span> Datos del Paciente e Ingreso
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
                  <section id="step-2" className="gx-form-section">
                    <h3 className="gx-form-section-title">
                      <span>2</span> Anamnesis y Antecedentes
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
                    <section id="step-3" className="gx-form-section">
                      <h3 className="gx-form-section-title">
                        <span>3</span> Revisión por Sistemas
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
                  <section id="step-4" className="gx-form-section">
                    <h3 className="gx-form-section-title">
                      <span>4</span> Examen Físico
                    </h3>
                    <WizardStepPhysicalExam
                      form={wizard.form}
                      setForm={wizard.setForm}
                      tenantSpecialties={tenant?.specialties ?? []}
                      uiPreferences={wizard.uiPreferences}
                    />
                  </section>

                  {/* ── Paso 5: Diagnóstico ───────────────────────────────────── */}
                  <section id="step-5" className="gx-form-section">
                    <h3 className="gx-form-section-title">
                      <span>5</span> Diagnóstico
                    </h3>
                    <WizardStepDiagnosisOnly
                      form={wizard.form}
                      setForm={wizard.setForm}
                      validationErrors={wizard.validationErrors}
                      triggerMagicCieFill={wizard.triggerMagicCieFill}
                    />
                  </section>

                  {/* ── Paso 6: Tratamiento y Plan ────────────────────────────── */}
                  <section id="step-6" className="gx-form-section">
                    <h3 className="gx-form-section-title">
                      <span>6</span> Tratamiento y Plan
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

                  {/* ACTION BAR MOBILE (visible solo en pantallas pequeñas) */}
                  <div className="lg:hidden hce-sticky-action-bar flex flex-col gap-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 mt-8 border-t border-border">
                    <p className="font-bold text-ink text-center">Consulta lista para guardar</p>
                    <div className="flex flex-row gap-3">
                      <button
                        onClick={() => void wizard.handleSaveWithoutPdf()}
                        className="hce-btn-secondary flex-1 justify-center"
                        disabled={wizard.saving}
                      >
                        {wizard.saving ? "..." : "Solo guardar"}
                      </button>
                      <button
                        onClick={() => void wizard.handleSaveWithPdf()}
                        className="hce-btn-primary flex-1 justify-center"
                        disabled={wizard.saving}
                      >
                        Guardar y PDF
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="my-12 rounded-2xl border border-dashed border-border/60 bg-bg-soft/50 p-8 text-center">
                  <p className="text-ink-soft font-medium">Selecciona o crea un paciente arriba para continuar redactando la consulta.</p>
                </div>
              )}
            </div>
          </div>
        </article>
      ) : (
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          {wizard.wizardDraft ? (() => {
            const draftPatient = wizard.patients.find(p => p.id === wizard.wizardDraft?.patientId);
            const draftPatientName = draftPatient ? draftPatient.full_name : "Paciente sin asignar";
            
            return (
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
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
                    className="hce-btn-primary flex-1 md:flex-none justify-center"
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
