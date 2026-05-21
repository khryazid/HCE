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

  // M-11: Guardar borrador inmediatamente cuando el usuario:
  //   1. Cierra/recarga la pestaña (beforeunload)
  //   2. Cambia de pestaña o minimiza (visibilitychange → hidden)
  // Esto previene pérdida del borrador si el debounce de 300ms no alcanzó a dispararse.
  useEffect(() => {
    if (!wizardOpen || !draftRestoredRef.current) return;

    const flushNow = () => {
      context.saveWizardDraft(form, step);
    };

    const onBeforeUnload = () => flushNow();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushNow();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [context, draftRestoredRef, form, step, wizardOpen]);
}