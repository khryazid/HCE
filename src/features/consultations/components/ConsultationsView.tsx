"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { ConsultasSkeleton } from "@/components/ui/skeletons";
import {
  EmptyState,
  EmptyStateIconConsultations,
} from "@/components/ui/empty-state";
import { useConsultationWizard } from "@/features/consultations/lib/use-consultation-wizard";
import { WizardStepPatient } from "@/features/consultations/components/wizard-step-patient";
import { WizardStepDiagnosis } from "@/features/consultations/components/wizard-step-diagnosis";
import { WizardStepTreatment } from "@/features/consultations/components/wizard-step-treatment";

export default function ConsultationsView() {
  const { tenant, loading: tenantLoading } = useTenant();
  const wizard = useConsultationWizard(tenant);

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
              Registro guiado por pasos: paciente, anamnesis y diagnóstico, tratamiento y PDF.
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
        <article className="space-y-4">

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
          </div>

          {/* Step 1: Paciente */}
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-ink border-b border-border pb-3">
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">1</span>
              Paciente
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
              {/* Step 2: Diagnóstico */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-ink border-b border-border pb-3">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">2</span>
                  Anamnesis y Diagnóstico
                </h3>
                <WizardStepDiagnosis
                  form={wizard.form}
                  setForm={wizard.setForm}
                  validationErrors={wizard.validationErrors}
                  triggerMagicCieFill={wizard.triggerMagicCieFill}
                />
              </section>

              {/* Step 3: Tratamiento */}
              <section className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-ink border-b border-border pb-3">
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-xs font-extrabold text-accent">3</span>
                  Tratamiento
                </h3>
                <WizardStepTreatment
                  form={wizard.form}
                  setForm={wizard.setForm}
                  templates={wizard.templates}
                  validationErrors={wizard.validationErrors}
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
