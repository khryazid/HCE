export const APP_EVENT_ONBOARDING_SAVED = "hce:onboarding-saved";
export const APP_EVENT_CONSULTATION_SAVED = "hce:consultation-saved";
export const APP_EVENT_CIE_SUGGESTIONS_REQUESTED = "hce:cie-suggestions-requested";
export const APP_EVENT_CIE_SUGGESTIONS_COMPLETED = "hce:cie-suggestions-completed";

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