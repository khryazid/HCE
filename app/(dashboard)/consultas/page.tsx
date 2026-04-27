"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { ConsultasSkeleton } from "@/components/ui/skeletons";
import { useConsultationWizard } from "@/lib/consultations/use-consultation-wizard";
import { WizardStepPatient } from "@/components/clinical/wizard-step-patient";
import { WizardStepDiagnosis } from "@/components/clinical/wizard-step-diagnosis";
import { WizardStepTreatment } from "@/components/clinical/wizard-step-treatment";

export default function ConsultasPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const wizard = useConsultationWizard(tenant);

  if (tenantLoading || wizard.dataLoading) {
    return <ConsultasSkeleton />;
  }


  return (
    <section className="hce-page">
      <header className="hce-surface flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="hce-page-header">
          <h1 className="hce-page-title">
            Flujo de consulta
          </h1>
          <p className="hce-page-lead">
            Registro guiado por pasos: paciente, anamnesis y diagnostico,
            tratamiento, confirmacion y PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={wizard.openWizard}
          className="hce-btn-primary"
        >
          Nueva consulta
        </button>
      </header>

      {wizard.message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {wizard.message}
        </div>
      ) : null}

      {wizard.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {wizard.error}
        </div>
      ) : null}

      {wizard.wizardOpen ? (
        <article className="space-y-6">
          <div className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between hce-surface p-6 rounded-2xl">
            <div className="space-y-2">
              <p className="hce-kicker">Registro Clínico</p>
              <h2 className="text-2xl font-semibold text-ink">Nueva Consulta</h2>
              <p className="text-sm text-ink-soft">Completa los datos en un solo formulario y guarda al finalizar.</p>
            </div>
            <button
              type="button"
              className="hce-btn-secondary"
              onClick={wizard.resetWizard}
            >
              Cancelar
            </button>
          </div>

          <section className="hce-surface p-6 rounded-2xl space-y-4">
            <h3 className="text-lg font-semibold text-ink border-b border-border pb-3">1. Paciente</h3>
            <WizardStepPatient
              form={wizard.form}
              setForm={wizard.setForm}
              patients={wizard.patients}
              quickPatient={wizard.quickPatient}
              setQuickPatient={wizard.setQuickPatient}
              pendingFollowUp={wizard.pendingFollowUp}
              latestPatientRecord={wizard.latestPatientRecord}
              validationErrors={wizard.validationErrors}
              onCreateQuickPatient={() => void wizard.createQuickPatient()}
              onApplyConsultaMode={wizard.applyConsultaMode}
              onApplyFollowUpMode={wizard.applyFollowUpMode}
            />
          </section>

          {wizard.form.patientId ? (
            <>
              <section className="hce-surface p-6 rounded-2xl space-y-4">
                <WizardStepDiagnosis
                  form={wizard.form}
                  setForm={wizard.setForm}
                  validationErrors={wizard.validationErrors}
                  triggerMagicCieFill={wizard.triggerMagicCieFill}
                />
              </section>

              <section className="hce-surface p-6 rounded-2xl space-y-4">
                <WizardStepTreatment
                  form={wizard.form}
                  setForm={wizard.setForm}
                  templates={wizard.templates}
                  validationErrors={wizard.validationErrors}
                  onApplyTemplate={wizard.applyTemplate}
                />
              </section>

              <div className="sticky bottom-4 z-10 rounded-2xl border border-border bg-card/95 backdrop-blur-sm p-4 shadow-xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div>
                  <p className="font-semibold text-ink">Consulta lista para guardar</p>
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
            <div className="hce-surface p-6 rounded-2xl text-center">
              <p className="text-ink-soft">Selecciona o crea un paciente para continuar con la consulta.</p>
            </div>
          )}
        </article>
      ) : null}
    </section>
  );
}
