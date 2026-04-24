export type CieCatalogEntry = {
  code: string;
  description: string;
  version: string;
};

export const CIE_CATALOG_VERSION = "2026.04";

export const CIE_CATALOG: CieCatalogEntry[] = [
  { code: "A09", description: "Diarrea y gastroenteritis de presunto origen infeccioso", version: CIE_CATALOG_VERSION },
  { code: "K30", description: "Dispepsia funcional", version: CIE_CATALOG_VERSION },
  { code: "J06.9", description: "Infeccion aguda de vias respiratorias superiores", version: CIE_CATALOG_VERSION },
  { code: "M54.5", description: "Dolor lumbar", version: CIE_CATALOG_VERSION },
  { code: "R51", description: "Cefalea", version: CIE_CATALOG_VERSION },
  { code: "E11.9", description: "Diabetes mellitus tipo 2 sin complicaciones", version: CIE_CATALOG_VERSION },
  { code: "I10", description: "Hipertension esencial primaria", version: CIE_CATALOG_VERSION },
  { code: "N39.0", description: "Infeccion de vias urinarias", version: CIE_CATALOG_VERSION },
];

export function searchCieCatalog(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return CIE_CATALOG;
  }

  return CIE_CATALOG.filter(
    (entry) =>
      entry.code.toLowerCase().includes(normalized) ||
      entry.description.toLowerCase().includes(normalized),
  );
}
