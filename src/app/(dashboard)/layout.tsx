import type { Metadata } from "next";
import { PanelErrorBoundary } from "@/components/ui/panel-error-boundary";
import { DashboardOnboardingGuard } from "@/features/dashboard/components/dashboard-onboarding-guard";
import { GlobalSearch } from "@/features/dashboard/components/global-search";
import { Topnav, BottomNav, MobileHeader } from "@/features/dashboard/components/topnav";
import { SyncStatusBanner } from "@/features/sync/components/sync-status-banner";
import { SubscriptionBanner } from "@/features/dashboard/components/subscription-banner";
import { TenantProvider } from "@/lib/supabase/tenant-context";
import { ClinicalProvider } from "@/features/consultations/context/clinical-context";
import { getPublicGlobalConfig } from "@/lib/supabase/actions";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Plus, AlertTriangle } from "lucide-react";

/**
 * Todas las páginas privadas del dashboard heredan noindex de este layout.
 * Evita que Google indexe URLs que requieren autenticación.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const globalConfig = await getPublicGlobalConfig();
  
  let isSuperAdmin = false;
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Check legacy env-based admin
      if (user.email && process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
        isSuperAdmin = true;
      }
      // Check DB-based platform admin (new RBAC system)
      if (!isSuperAdmin) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("is_platform_admin")
          .eq("doctor_id", user.id)
          .maybeSingle();
        if (profileData && (profileData as any).is_platform_admin === true) {
          isSuperAdmin = true;
        }
      }
    }
  } catch (e) {
    // ignore
  }

  if (globalConfig.maintenance_mode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg text-ink p-6 text-center">
        <AlertTriangle className="w-16 h-16 text-accent mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold tracking-tight mb-4">Estamos en Mantenimiento</h1>
        <p className="text-ink-soft max-w-md">
          Nuestros servidores están en mantenimiento programado para mejorar tu experiencia. 
          Estaremos de vuelta en unos minutos. Gracias por tu paciencia.
        </p>
      </div>
    );
  }

  return (
    <TenantProvider>
      <ClinicalProvider>
        <div className="flex flex-col min-h-screen bg-bg">
          {/* Desktop Top Navigation */}
          <PanelErrorBoundary>
            <Topnav />
          </PanelErrorBoundary>

          {/* Mobile top header */}
          <PanelErrorBoundary>
            <MobileHeader />
          </PanelErrorBoundary>

          {/* Main content area */}
          <div className="flex-1 flex flex-col relative w-full">
            <DashboardOnboardingGuard isAdmin={isSuperAdmin} />

            {globalConfig.global_notice && (
              <div className="w-full bg-accent/10 border-b border-accent/20 px-4 py-3 flex items-center justify-center text-accent text-sm font-medium text-center">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{globalConfig.global_notice}</span>
              </div>
            )}

            <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-[1440px]">
                <div className="mb-6 space-y-3">
                  <PanelErrorBoundary>
                    <SubscriptionBanner />
                  </PanelErrorBoundary>
                  <PanelErrorBoundary>
                    <GlobalSearch />
                  </PanelErrorBoundary>
                  <PanelErrorBoundary>
                    <SyncStatusBanner />
                  </PanelErrorBoundary>
                </div>
                
                <PanelErrorBoundary>
                  {children}
                </PanelErrorBoundary>
              </div>
            </main>
          </div>

          {/* Mobile FAB */}
          <Link
            href="/consultas"
            aria-label="Nueva consulta"
            className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-transform hover:scale-105 active:scale-95 lg:hidden"
          >
            <Plus className="h-6 w-6" aria-hidden="true" />
          </Link>

          {/* Mobile bottom nav */}
          <PanelErrorBoundary>
            <BottomNav />
          </PanelErrorBoundary>
        </div>
      </ClinicalProvider>
    </TenantProvider>
  );
}
