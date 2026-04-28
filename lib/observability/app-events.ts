// ─── Eventos de ciclo de vida ───────────────────────────────────────────────
export const APP_EVENT_ONBOARDING_SAVED = "hce:onboarding-saved";
export const APP_EVENT_CONSULTATION_SAVED = "hce:consultation-saved";

// ─── Eventos de sugerencias CIE ─────────────────────────────────────────────
export const APP_EVENT_CIE_SUGGESTIONS_REQUESTED = "hce:cie-suggestions-requested";
export const APP_EVENT_CIE_SUGGESTIONS_COMPLETED = "hce:cie-suggestions-completed";

// ─── Eventos de observabilidad / error ──────────────────────────────────────
export const APP_EVENT_SYNC_ERROR = "hce:sync-error";
export const APP_EVENT_SYNC_ABANDONED = "hce:sync-abandoned";
export const APP_EVENT_API_ERROR = "hce:api-error";
export const APP_EVENT_AUTH_ERROR = "hce:auth-error";

export type AppEventDetail = Record<string, unknown>;

export function emitAppEvent(eventName: string, detail: AppEventDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<AppEventDetail>(eventName, {
      detail,
    }),
  );
}