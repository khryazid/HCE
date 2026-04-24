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

    const bootstrap = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/login");
          return;
        }

        const profile = await loadTenantProfile(session.user.id);

        if (active) {
          setState({
            tenant: profile,
            session,
            loading: false,
            error: profile
              ? null
              : "No se encontro perfil de tenant para esta cuenta.",
          });
        }
      } catch (error) {
        if (active) {
          setState({
            tenant: null,
            session: null,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "No se pudo cargar la sesion.",
          });
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <TenantContext.Provider value={state}>{children}</TenantContext.Provider>
  );
}
