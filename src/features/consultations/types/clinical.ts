export type SpecialtyKind = "odontologia" | "pediatria" | "medicina-general";

type OdontogramToothState = "sano" | "caries" | "ausente" | "tratado";

type OdontogramTooth = {
  numero: string;
  estado: OdontogramToothState;
  notas?: string;
};

type GrowthPoint = {
  edad_meses: number;
  peso_kg: number;
  talla_cm: number;
  percentil: number;
};

type SpecialtyCore = {
  specialty_kind: SpecialtyKind;
  schema_version: number;
  recorded_at: string;
  doctor_id: string;
};

type OdontologiaData = SpecialtyCore & {
  specialty_kind: "odontologia";
  piezas: OdontogramTooth[];
};

type PediatriaData = SpecialtyCore & {
  specialty_kind: "pediatria";
  growth: GrowthPoint[];
};

type MedicinaGeneralData = SpecialtyCore & {
  specialty_kind: "medicina-general";
  motivo_consulta: string;
  cie10: string[];
  plan: string;
};

export type SpecialtyData =
  | OdontologiaData
  | PediatriaData
  | MedicinaGeneralData;


