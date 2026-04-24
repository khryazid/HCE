export type SpecialtyKind = "odontologia" | "pediatria" | "medicina-general";

export type SpecialtyCore = {
  specialty_kind: SpecialtyKind;
  schema_version: number;
  recorded_at: string;
  doctor_id: string;
};

export type OdontologiaData = SpecialtyCore & {
  specialty_kind: "odontologia";
  piezas: Array<{
    numero: string;
    estado: "sano" | "caries" | "ausente" | "tratado";
    notas?: string;
  }>;
};

export type PediatriaData = SpecialtyCore & {
  specialty_kind: "pediatria";
  edad_meses: number;
  peso_kg: number;
  talla_cm: number;
  percentil: number;
};

export type MedicinaGeneralData = SpecialtyCore & {
  specialty_kind: "medicina-general";
  motivo_consulta: string;
  cie10: string[];
  plan: string;
};

export type SpecialtyData =
  | OdontologiaData
  | PediatriaData
  | MedicinaGeneralData;

export function isSpecialtyData(value: unknown): value is SpecialtyData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const v = value as Record<string, unknown>;
  return (
    typeof v.specialty_kind === "string" &&
    typeof v.schema_version === "number" &&
    typeof v.recorded_at === "string" &&
    typeof v.doctor_id === "string"
  );
}
