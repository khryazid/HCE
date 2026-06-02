"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadTenantProfile, type TenantProfile } from "@/lib/supabase/profile";
import { initDbCrypto, clearOfflineDb } from "@/lib/db/indexeddb";
import { realtimeChannelManager } from "@/lib/supabase/realtime-channel-manager";
import type { Session } from "@supabase/supabase-js";

type TenantState = {
  tenant: TenantProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
};

const TenantContext = createContext<TenantState>({
  tenant: null,
  session: null,
  loading: true,
  error: null,
});

export function useTenant() {
  return useContext(TenantContext);
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<TenantState>({
    tenant: null,
    session: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const supabase = getSupabaseClient();

    const bootstrap = async () => {
      try {
        // getUser() validates with the server — safer than getSession()
        // which can trigger a background refresh and log noisy errors.
        const { data: { user }, error } = await supabase.auth.getUser();
        const { data: { session } } = await supabase.auth.getSession();

        if (error || !user || !session) {
          if (active) router.replace("/login");
          return;
        }

        const profile = await loadTenantProfile(user.id);
        await initDbCrypto(user.id);

        if (active) {
          setState({
            tenant: profile,
            session: session,
            loading: false,
            error: profile
              ? null
              : "No se encontro perfil de tenant para esta cuenta.",
          });
        }
      } catch (err) {
        if (active) {
          setState({
            tenant: null,
            session: null,
            loading: false,
            error:
              err instanceof Error
                ? err.message
                : "No se pudo cargar la sesion.",
          });
        }
      }
    };

    void bootstrap();

    // Listen for session events. SIGNED_OUT fires when the refresh token
    // is invalid/expired — redirect instead of logging uncaught errors.
    // M-01: clearOfflineDb() purges local IDB data on automatic sign-out
    // (token expiry), not just on manual logout via the button.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_OUT") {
          if (active) {
            // Sync-3.2: Release all Realtime channels before redirecting so no
            // WebSocket callback fires with the signed-out user's data.
            realtimeChannelManager.releaseAll();
            setState({ tenant: null, session: null, loading: false, error: null });
            clearOfflineDb().catch((e) =>
              console.warn("[TenantProvider] clearOfflineDb on SIGNED_OUT failed:", e)
            );
            router.replace("/login");
          }
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <TenantContext.Provider value={state}>{children}</TenantContext.Provider>
  );
}
