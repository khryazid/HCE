export type PatientStatus = "activo" | "inactivo" | "en-seguimiento" | "alta";

export const PATIENT_STATUS_OPTIONS: Record<
  PatientStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  activo: {
    label: "Activo",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  "en-seguimiento": {
    label: "En seguimiento",
    bg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    dot: "bg-sky-500",
  },
  inactivo: {
    label: "Inactivo",
    bg: "bg-slate-50",
    text: "text-slate-500",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  alta: {
    label: "Alta",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    dot: "bg-amber-500",
  },
};

export type PatientRecord = {
  id: string;
  clinic_id: string;
  doctor_id: string;
  document_number: string;
  full_name: string;
  birth_date: string | null;
  status: PatientStatus;
  created_at: string;
  updated_at: string;
};

type PatientFormValues = {
  document_number: string;
  full_name: string;
  birth_date: string;
};
