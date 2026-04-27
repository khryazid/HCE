"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

type ModalPhase = "closed" | "confirm" | "leaving";

type LogoutButtonProps = {
  mode?: "full" | "icon" | "nav";
};

export function LogoutButton({ mode = "full" }: LogoutButtonProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<ModalPhase>("closed");

  async function handleLogout() {
    setPhase("leaving");

    // Show farewell animation for 1.2s before actually signing out
    await new Promise((resolve) => setTimeout(resolve, 1200));

    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPhase("confirm")}
        aria-label="Cerrar sesion"
        title="Cerrar sesion"
        className={
          mode === "icon"
            ? "inline-flex h-10 w-full items-center justify-center rounded-xl border border-border bg-card text-ink-soft transition hover:bg-bg-soft"
            : mode === "nav"
              ? "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium text-ink-soft transition hover:text-ink-soft"
              : "inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-ink transition hover:bg-bg-soft"
        }
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        {mode === "full" ? "Cerrar sesion" : null}
        {mode === "nav" ? <span>Cerrar</span> : null}
      </button>

      {/* Overlay */}
      {phase !== "closed" ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        >
          <div
            className="mx-4 w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-2xl"
          >
            {phase === "confirm" ? (
              <div className="space-y-5">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                  </div>
                </div>

                <div className="text-center">
                  <h3 className="text-lg font-semibold text-ink">
                    Cerrar sesion
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Tus datos clinicos locales se mantienen seguros. Podras acceder de nuevo con tu cuenta.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setPhase("closed")}
                    className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-ink-soft transition hover:bg-bg-soft"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Cerrar sesion
                  </button>
                </div>
              </div>
            ) : (
              /* Farewell phase */
              <div className="space-y-4 py-4 text-center">
                <div className="flex justify-center">
                  <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-teal-50 text-teal-600">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">
                    Hasta pronto
                  </h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Cerrando sesion de forma segura...
                  </p>
                </div>
                <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-bg-soft">
                  <div
                    className="h-full rounded-full bg-teal-500 transition-all duration-1000 ease-out"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
