"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";

type WizardDraftContext<TForm> = {
  wizardDraft: TForm | null;
  wizardDraftOpen: boolean;
  wizardDraftStep: number;
  saveWizardDraft: (form: TForm, step: number) => void;
};

type UseWizardDraftSyncParams<TForm> = {
  dataLoading: boolean;
  wizardOpen: boolean;
  step: number;
  form: TForm;
  setForm: (form: TForm) => void;
  setStep: (step: number) => void;
  setWizardOpen: (open: boolean) => void;
  setMessage: (message: string | null) => void;
  context: WizardDraftContext<TForm>;
  draftRestoredRef: MutableRefObject<boolean>;
};

export function useWizardDraftSync<TForm>({
  dataLoading,
  wizardOpen,
  step,
  form,
  setForm,
  setStep,
  setWizardOpen,
  setMessage,
  context,
  draftRestoredRef,
}: UseWizardDraftSyncParams<TForm>) {
  useEffect(() => {
    if (draftRestoredRef.current || dataLoading) {
      return;
    }

    draftRestoredRef.current = true;

    if (context.wizardDraft && context.wizardDraftOpen) {
      setForm(context.wizardDraft);
      setStep(context.wizardDraftStep);
      setWizardOpen(true);
      setMessage("Borrador de consulta restaurado.");
    }
  }, [
    context.wizardDraft,
    context.wizardDraftOpen,
    context.wizardDraftStep,
    dataLoading,
    draftRestoredRef,
    setForm,
    setMessage,
    setStep,
    setWizardOpen,
  ]);

  const formRef = useRef(form);
  const stepRef = useRef(step);
  const wizardOpenRef = useRef(wizardOpen);

  formRef.current = form;
  stepRef.current = step;
  wizardOpenRef.current = wizardOpen;

  useEffect(() => {
    if (!wizardOpenRef.current || !draftRestoredRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      context.saveWizardDraft(formRef.current, stepRef.current);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [context, draftRestoredRef, form, step, wizardOpen]);
}