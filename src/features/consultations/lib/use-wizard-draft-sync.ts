"use client";

import { useEffect } from "react";
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

  // Removemos el useEffect que sincronizaba refs redundantes.

  useEffect(() => {
    // Si no está abierto o no se ha restaurado aún, no sobrescribir el borrador
    if (!wizardOpen || !draftRestoredRef.current) {
      return;
    }

    // Debounce nativo simple: programamos el guardado y capturamos directamente por closure
    const timer = window.setTimeout(() => {
      context.saveWizardDraft(form, step);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [context, draftRestoredRef, form, step, wizardOpen]);
}