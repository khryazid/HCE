/**
 * lib/ui/format-date.ts
 *
 * Utilidad centralizada de formato de fechas para toda la app.
 * Usar estas funciones en lugar de llamadas directas a toLocaleString/toLocaleDateString
 * garantiza consistencia con el locale "es-EC" en toda la UI.
 */

const LOCALE = "es-EC" as const;

/**
 * Formatea una fecha ISO o timestamp numérico como fecha + hora.
 * Ejemplo: "27/04/2026, 14:30:00"
 */
export function formatDateTime(value: string | number | Date): string {
  return new Date(value).toLocaleString(LOCALE);
}

/**
 * Formatea una fecha ISO o timestamp numérico solo como fecha (sin hora).
 * Ejemplo: "27/04/2026"
 */
export function formatDate(value: string | number | Date): string {
  return new Date(value).toLocaleDateString(LOCALE);
}


