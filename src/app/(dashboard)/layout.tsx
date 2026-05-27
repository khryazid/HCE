import type { Metadata } from "next";
import { PanelErrorBoundary } from "@/components/ui/panel-error-boundary";
import { DashboardOnboardingGuard } from "@/features/dashboard/components/dashboard-onboarding-guard";
import { GlobalSearch } from "@/features/dashboard/components/global-search";
import { Topnav, BottomNav, MobileHeader } from "@/features/dashboard/components/topnav";
import { SyncStatusBanner } from "@/features/sync/components/sync-status-banner";
import { TenantProvider } from "@/lib/supabase/tenant-context";
import { ClinicalProvider } from "@/features/consultations/context/clinical-context";
import Link from "next/link";
import { Plus } from "lucide-react";

/**
 * Todas las páginas privadas del dashboard heredan noindex de este layout.
 * Evita que Google indexe URLs que requieren autenticación.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
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
            <DashboardOnboardingGuard />

            <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-7xl">
                <div className="mb-6 space-y-3">
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
