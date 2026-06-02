"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from "react";

import type { WizardForm } from "@/features/consultations/lib/use-consultation-wizard";

/**
 * Persistent clinical context that survives page navigation.
 *
 * Stores:
 * - The currently selected patient ID (shared between consultas ↔ pacientes)
 * - A snapshot of the wizard form so in-progress consultations survive navigation
 * - The wizard step
 * - Whether the wizard was open
 *
 * AUDIT FIX W-2: El draft ahora se persiste en localStorage además de en
 * memoria React. Esto garantiza que el borrador sobreviva:
 * - Recargas de página (F5)
 * - Cierre accidental de pestaña
 * - Crashes del navegador
 * La clave usada es "hce:wizard-draft" para consistencia con "hce:theme".
 */

const DRAFT_STORAGE_KEY = "hce:wizard-draft";

type DraftPayload = {
  form: WizardForm;
  step: number;
};

function readDraftFromStorage(): DraftPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DraftPayload;
  } catch {
    return null;
  }
}

function writeDraftToStorage(form: WizardForm, step: number) {
  try {
    const payload: DraftPayload = { form, step };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // localStorage lleno o no disponible — no bloquear la UI
  }
}

function clearDraftFromStorage() {
  try {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
  } catch {
    // no-op
  }
}

type ClinicalState = {
  /** Selected patient ID shared across pages */
  selectedPatientId: string;
  setSelectedPatientId: (id: string) => void;

  /** Wizard draft — survives navigation AND browser close */
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
  const [wizardDraftStep, setWizardDraftStep] = useState<number>(1);
  const [wizardDraftOpen, setWizardDraftOpen] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate draft from storage ONLY on the client to prevent SSR mismatches
  useEffect(() => {
    const storedDraft = readDraftFromStorage();
    if (storedDraft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWizardDraft(storedDraft.form);
       
      setWizardDraftStep(storedDraft.step);
       
      setWizardDraftOpen(true);
    }
     
    setIsHydrated(true);
  }, []);

  // Limpiar el draft de localStorage si ya no hay borrador en memoria
  // (ej. tras restaurar pero luego cancelar — clearWizardDraft lo maneja)
  useEffect(() => {
    if (!isHydrated) return;
    if (!wizardDraftOpen && !wizardDraft) {
      clearDraftFromStorage();
    }
  }, [wizardDraftOpen, wizardDraft, isHydrated]);

  const saveWizardDraft = useCallback((form: WizardForm, step: number) => {
    // Si la consulta está completamente vacía (no hay paciente seleccionado),
    // no tiene sentido guardarla como "Borrador Abandonado".
    if (!form.patientId) {
      clearDraftFromStorage();
      return;
    }

    // Persistir en localStorage primero (sobrevive crashes)
    writeDraftToStorage(form, step);
    // Luego actualizar estado React (para reactividad inmediata)
    setWizardDraft({ ...form });
    setWizardDraftStep(step);
    setWizardDraftOpen(true);
  }, []);

  const clearWizardDraft = useCallback(() => {
    clearDraftFromStorage();
    setWizardDraft(null);
    setWizardDraftStep(1);
    setWizardDraftOpen(false);
  }, []);

  const value = useMemo(() => ({
    selectedPatientId,
    setSelectedPatientId,
    wizardDraft,
    wizardDraftStep,
    wizardDraftOpen,
    saveWizardDraft,
    clearWizardDraft,
  }), [
    selectedPatientId,
    wizardDraft,
    wizardDraftStep,
    wizardDraftOpen,
    saveWizardDraft,
    clearWizardDraft,
  ]);

  return (
    <ClinicalContext.Provider value={value}>
      {children}
    </ClinicalContext.Provider>
  );
}
