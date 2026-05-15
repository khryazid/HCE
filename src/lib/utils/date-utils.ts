/**
 * date-utils.ts
 *
 * Utilidades compartidas para campos de fecha en formato DD/MM/AAAA.
 * Centraliza la validación y conversión para evitar errores en Supabase
 * (código 22008 — date/time field value out of range).
 */

/**
 * Verifica que una cadena represente una fecha real (no solo formato válido).
 * Acepta tanto yyyy-MM-dd (interno) como dd/mm/yyyy (display).
 */
export function isValidDateString(val: string | null | undefined): boolean {
  if (!val || val.trim() === "") return true; // vacío es válido (campo opcional)

  const isoMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const dmyMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!isoMatch && !dmyMatch) return false;

  const [y, m, d] = isoMatch
    ? [parseInt(isoMatch[1]), parseInt(isoMatch[2]), parseInt(isoMatch[3])]
    : [parseInt(dmyMatch![3]), parseInt(dmyMatch![2]), parseInt(dmyMatch![1])];

  if (m < 1 || m > 12 || d < 1 || d > 31) return false;

  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y &&
    dt.getMonth() === m - 1 &&
    dt.getDate() === d
  );
}

/**
 * Convierte una fecha de cualquier formato reconocido al formato ISO yyyy-MM-dd
 * que Supabase/PostgreSQL espera.
 * Devuelve null si el valor está vacío o es inválido.
 */
export function toISODateString(val: string | null | undefined): string | null {
  if (!val || val.trim() === "") return null;

  // Already yyyy-MM-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return isValidDateString(val) ? val : null;
  }

  // dd/mm/yyyy → yyyy-MM-dd
  const dmyMatch = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const iso = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    return isValidDateString(iso) ? iso : null;
  }

  return null;
}
