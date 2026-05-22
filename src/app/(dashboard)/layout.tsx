import type { Metadata } from "next";
import { PanelErrorBoundary } from "@/components/ui/panel-error-boundary";
import { DashboardOnboardingGuard } from "@/features/dashboard/components/dashboard-onboarding-guard";
import { GlobalSearch } from "@/features/dashboard/components/global-search";
import { Sidebar, BottomNav, MobileHeader } from "@/features/dashboard/components/sidebar";
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
        <div className="flex h-full min-h-screen">
          {/* Desktop sidebar — hidden on mobile */}
          <PanelErrorBoundary>
            <Sidebar />
          </PanelErrorBoundary>

          {/* Main content column */}
          <div className="flex flex-1 flex-col overflow-x-hidden">

            {/* Mobile top header — sits in normal flow above main */}
            <PanelErrorBoundary>
              <MobileHeader />
            </PanelErrorBoundary>

            <DashboardOnboardingGuard />

            <main
              className="flex-1 p-4 pb-24 pt-4 sm:p-6 sm:pt-6 lg:p-8 lg:pb-8 lg:pt-8"
            >
              <div className="mx-auto w-full max-w-6xl">
                <div className="mb-4 space-y-3">
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

          {/* Mobile FAB — AUDIT FIX A-3: aria-label para screen readers */}
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
