"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTenant } from "@/lib/supabase/tenant-context";
import { isOnboardingProfileComplete, readOnboardingProfile } from "@/lib/supabase/onboarding";
import { getSupabaseClient } from "@/lib/supabase/client";
import { CURRENT_TERMS_VERSION } from "@/lib/constants/app";
import { getActiveTermsVersion } from "@/lib/supabase/actions";
import { TermsAcceptanceModal } from "./terms-acceptance-modal";

export function DashboardOnboardingGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { tenant, loading } = useTenant();
  const [ready, setReady] = useState(false);
  const [needsTerms, setNeedsTerms] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (loading) return;

    // /admin is the super-admin panel — skip all clinical checks.
    if (pathname === "/admin") {
      const t = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(t);
    }

    const isBillingPage = pathname === "/billing";
    const isProfileSetupPage = pathname === "/ajustes";
    const isOnboardingPage = pathname.startsWith("/onboarding");

    if (!tenant) {
      if (isOnboardingPage) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setReady(true);
      } else {
        router.replace("/onboarding");
      }
      return;
    }


    // 1. Check Subscription Status
    // "lifetime", "active" y "trialing" con fecha válida otorgan acceso.
    const validSubscriptionStatuses = ["active", "trialing", "lifetime"];
    const status = tenant.subscription_status;
    let hasActiveSub = validSubscriptionStatuses.includes(status ?? "incomplete");

    // Fix B-10: determinar la razón exacta por la que se pierde el acceso
    // para mostrar un mensaje claro en /billing en lugar de un redirect silencioso.
    let expiryReason: "trial_expired" | "subscription_expired" | "inactive" | null = null;

    // Enforce expiration check
    if (hasActiveSub && (status === "active" || status === "trialing") && tenant.subscription_expires_at) {
      const expiresAt = new Date(tenant.subscription_expires_at).getTime();
      if (expiresAt < Date.now()) {
        hasActiveSub = false;
        expiryReason = status === "trialing" ? "trial_expired" : "subscription_expired";
      }
    } else if (!hasActiveSub) {
      expiryReason = "inactive";
    }

    if (!hasActiveSub && !isBillingPage) {
      // Persistir la razón en sessionStorage para que BillingView la lea y muestre
      // un mensaje contextual ("Tu prueba de 7 días ha terminado" vs "Tu suscripción expiró").
      if (expiryReason) {
        try { sessionStorage.setItem("billing_redirect_reason", expiryReason); } catch { /* ignore */ }
      }
      router.replace(`/billing${expiryReason ? `?reason=${expiryReason}` : ""}`);
      return;
    }

    if (hasActiveSub && isBillingPage) {
      router.replace("/dashboard");
      return;
    }

    // 2. Check Onboarding Complete — read from Supabase user metadata.
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      // El setup completo ahora requiere terminar el Onboarding (step 4 y completed=true)
      const isReady = tenant.onboarding_state?.completed === true;

      if (!isReady && !isProfileSetupPage && !isBillingPage && !pathname.startsWith("/onboarding")) {
        router.replace("/onboarding");
        return;
      }

      if (isReady && tenant.role === "assistant") {
        const assistantAllowedRoutes = ["/agenda", "/pacientes", "/caja", "/ajustes", "/docs"];
        const isAllowed = assistantAllowedRoutes.some(r => pathname === r || pathname.startsWith(r + "/"));
        if (!isAllowed && !isBillingPage && !isProfileSetupPage) {
          router.replace("/agenda");
          return;
        }
      }

      // 3. Verify Terms Version
      getActiveTermsVersion().then((activeVersion) => {
        if (tenant.terms_version !== activeVersion) {
          setNeedsTerms(true);
        }
        setReady(true);
      }).catch(() => {
        // En caso de error de red, usamos la constante como respaldo seguro
        if (tenant.terms_version !== CURRENT_TERMS_VERSION) {
          setNeedsTerms(true);
        }
        setReady(true);
      });
      
    }).catch(() => {
      router.replace("/login");
    });
  }, [loading, tenant, pathname, router, supabase, searchParams]);

  if (ready) {
    if (needsTerms) {
      return <TermsAcceptanceModal isOpen={true} />;
    }
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-bg/80 backdrop-blur-sm">
      <div className="hce-surface flex flex-col items-center p-8 text-center shadow-2xl">
        <svg
          className="h-10 w-10 animate-spin text-accent"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        <p className="mt-4 font-semibold text-ink">Preparando entorno clínico...</p>
        <p className="mt-1 text-sm text-ink-soft">Validando credenciales y suscripción segura</p>
      </div>
    </div>
  );
}
