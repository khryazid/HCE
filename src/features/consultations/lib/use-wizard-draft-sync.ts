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
      // Removido: setWizardOpen(true) para evitar apertura automática.
      // Se mostrará en una tarjeta de "Consulta Abandonada".
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

  // M-11: Guardar borrador robustamente
  // Guardamos en cada cambio de form/step con un debounce y al desmontar.
  useEffect(() => {
    if (!wizardOpen || !draftRestoredRef.current) return;

    // Guardar inmediatamente si el usuario recarga la pestaña o minimiza
    const flushNow = () => {
      context.saveWizardDraft(form, step);
    };

    const onBeforeUnload = () => flushNow();
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushNow();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Auto-guardado cada vez que cambia el form (con debounce en efecto)
    const timeout = setTimeout(() => {
      flushNow();
    }, 1000);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      // Salvar el borrador cuando el componente se desmonta (ej. navegando por el sidebar)
      flushNow();
    };
  }, [context, draftRestoredRef, form, step, wizardOpen]);
}