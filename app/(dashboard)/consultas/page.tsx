"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { ConsultasSkeleton } from "@/components/ui/skeletons";
import { useConsultationWizard } from "@/lib/consultations/use-consultation-wizard";
import { WizardStepPatient } from "@/components/clinical/wizard-step-patient";
import { WizardStepDiagnosis } from "@/components/clinical/wizard-step-diagnosis";
import { WizardStepTreatment } from "@/components/clinical/wizard-step-treatment";
import { WizardStepConfirm } from "@/components/clinical/wizard-step-confirm";
import { WizardNavigation } from "@/components/clinical/wizard-navigation";
import { PatientTimeline } from "@/components/clinical/patient-timeline";

export default function ConsultasPage() {
  const { tenant, loading: tenantLoading } = useTenant();
  const wizard = useConsultationWizard(tenant);

  if (tenantLoading || wizard.dataLoading) {
    return <ConsultasSkeleton />;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Flujo de consulta
          </h1>
          <p className="text-sm text-slate-700">
            Registro guiado por pasos: paciente, anamnesis y diagnostico,
            tratamiento, confirmacion y PDF.
          </p>
        </div>
        <button
          type="button"
          onClick={wizard.openWizard}
          className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white"
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
        <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Paso {wizard.step} de 4
            </h2>
            <button
              type="button"
              className="text-sm font-semibold text-slate-600"
              onClick={wizard.resetWizard}
            >
              Cerrar
            </button>
          </div>

          {wizard.step === 1 ? (
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
          ) : null}

          {wizard.step === 2 ? (
            <WizardStepDiagnosis
              form={wizard.form}
              setForm={wizard.setForm}
              cieSuggestions={wizard.cieSuggestions}
              cieSuggestionSource={wizard.cieSuggestionSource}
              cieSuggestionLoading={wizard.cieSuggestionLoading}
              cieSuggestionError={wizard.cieSuggestionError}
              cieMatches={wizard.cieMatches}
              selectedCieCodes={wizard.selectedCieCodes}
              validationErrors={wizard.validationErrors}
              onApplyCieSuggestion={wizard.applyCieSuggestion}
            />
          ) : null}

          {wizard.step === 3 ? (
            <WizardStepTreatment
              form={wizard.form}
              setForm={wizard.setForm}
              templates={wizard.templates}
              validationErrors={wizard.validationErrors}
              onApplyTemplate={wizard.applyTemplate}
            />
          ) : null}

          {wizard.step === 4 ? (
            <WizardStepConfirm
              form={wizard.form}
              patients={wizard.patients}
              pendingFollowUp={wizard.pendingFollowUp}
            />
          ) : null}

          <WizardNavigation
            step={wizard.step}
            saving={wizard.saving}
            onPrev={wizard.prevStep}
            onNext={wizard.nextStep}
            onComplete={() => void wizard.handleComplete()}
          />
        </article>
      ) : null}

      <PatientTimeline
        patients={wizard.patients}
        timelineRows={wizard.timelineRows}
        selectedPatientTimelineId={wizard.selectedPatientTimelineId}
        onSelectPatient={wizard.setSelectedPatientTimelineId}
      />
    </section>
  );
}
