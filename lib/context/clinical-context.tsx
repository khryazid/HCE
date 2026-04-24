"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import type { WizardForm } from "@/lib/consultations/use-consultation-wizard";

/**
 * Persistent clinical context that survives page navigation.
 *
 * Stores:
 * - The currently selected patient ID (shared between consultas ↔ pacientes)
 * - A snapshot of the wizard form so in-progress consultations survive navigation
 * - The wizard step
 * - Whether the wizard was open
 */

type ClinicalState = {
  /** Selected patient ID shared across pages */
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;

  /** Wizard draft — survives navigation */
  wizardDraft: WizardForm | null;
  wizardDraftStep: number;
  wizardDraftOpen: boolean;
  saveWizardDraft: (form: WizardForm, step: number) => void;
  clearWizardDraft: () => void;
};

const ClinicalContext = createContext<ClinicalState>({
  selectedPatientId: "",
  setSelectedPatientId: () => {},
  wizardDraft: null,
  wizardDraftStep: 1,
  wizardDraftOpen: false,
  saveWizardDraft: () => {},
  clearWizardDraft: () => {},
});

export function useClinicalContext() {
  return useContext(ClinicalContext);
}

export function ClinicalProvider({ children }: { children: ReactNode }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [wizardDraft, setWizardDraft] = useState<WizardForm | null>(null);
  const [wizardDraftStep, setWizardDraftStep] = useState(1);
  const [wizardDraftOpen, setWizardDraftOpen] = useState(false);

  const saveWizardDraft = useCallback((form: WizardForm, step: number) => {
    setWizardDraft({ ...form });
    setWizardDraftStep(step);
    setWizardDraftOpen(true);
  }, []);

  const clearWizardDraft = useCallback(() => {
    setWizardDraft(null);
    setWizardDraftStep(1);
    setWizardDraftOpen(false);
  }, []);

  return (
    <ClinicalContext.Provider
      value={{
        selectedPatientId,
        setSelectedPatientId,
        wizardDraft,
        wizardDraftStep,
        wizardDraftOpen,
        saveWizardDraft,
        clearWizardDraft,
      }}
    >
      {children}
    </ClinicalContext.Provider>
  );
}
