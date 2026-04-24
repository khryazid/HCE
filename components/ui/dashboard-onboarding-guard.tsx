"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  isOnboardingProfileComplete,
  readOnboardingProfile,
} from "@/lib/supabase/onboarding";

export function DashboardOnboardingGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const checkOnboarding = async () => {
      try {
        const supabase = getSupabaseClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (active) {
            router.replace("/login");
          }
          return;
        }

        const onboardingProfile = readOnboardingProfile(session.user.user_metadata);
        const isReady = isOnboardingProfileComplete(onboardingProfile);
        const isOnboardingPage = pathname === "/onboarding";

        if (!isReady && !isOnboardingPage) {
          if (active) {
            router.replace("/onboarding");
          }
          return;
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    void checkOnboarding();

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (ready) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
      Validando perfil profesional inicial...
    </div>
  );
}
