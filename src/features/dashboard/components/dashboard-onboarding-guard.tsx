"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/lib/supabase/tenant-context";
import { isOnboardingProfileComplete, readOnboardingProfile } from "@/lib/supabase/onboarding";

export function DashboardOnboardingGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, session, loading } = useTenant();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!session || !tenant) {
      router.replace("/login");
      return;
    }

    const isBillingPage = pathname === "/billing";
    const isProfileSetupPage = pathname === "/ajustes";

    // 1. Check Subscription Status
    const validSubscriptionStatuses = ["active", "trialing"];
    const status = tenant.subscription_status;
    const hasActiveSub = validSubscriptionStatuses.includes(status ?? "incomplete");

    if (!hasActiveSub && !isBillingPage) {
      router.replace("/billing");
      return;
    }

    // Si ya está activo y entra a /billing, lo devolvemos al dashboard
    if (hasActiveSub && isBillingPage) {
      router.replace("/dashboard");
      return;
    }

    // 2. Check Onboarding Complete
    const onboardingProfile = readOnboardingProfile(session.user.user_metadata);
    const isReady = isOnboardingProfileComplete(onboardingProfile);

    if (!isReady && !isProfileSetupPage && !isBillingPage) {
      router.replace("/ajustes");
      return;
    }

    const timer = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(timer);
  }, [loading, session, tenant, pathname, router]);

  if (ready) {
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
