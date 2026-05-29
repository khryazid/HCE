/**
 * A-14: Constantes de marca centralizadas.
 * Cambiar el nombre aquí lo propaga a toda la app.
 */
export const APP_NAME = "Glyphix" as const;
export const APP_TAGLINE = "Motor Clínico" as const;
export const APP_FULL_NAME = `${APP_NAME} — ${APP_TAGLINE}` as const;

/** Dominio canónico (producción) */
export const APP_DOMAIN = "glyphix.app" as const;
export const APP_URL = `https://${APP_DOMAIN}` as const;

/** Email de soporte / remitente de notificaciones */
export const APP_SUPPORT_EMAIL = `soporte@${APP_DOMAIN}` as const;
export const APP_FROM_EMAIL = `${APP_NAME} <recordatorios@${APP_DOMAIN}>` as const;

/** Versión actual de Términos y Condiciones */
export const CURRENT_TERMS_VERSION = "1.0.0" as const;
