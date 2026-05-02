import { DashboardOnboardingGuard } from "@/features/dashboard/components/dashboard-onboarding-guard";
import { Sidebar, BottomNav, MobileHeader } from "@/features/dashboard/components/sidebar";
import { SyncStatusBanner } from "@/features/sync/components/sync-status-banner";
import { GlobalSearch } from "@/features/dashboard/components/global-search";
import { TenantProvider } from "@/lib/supabase/tenant-context";
import { ClinicalProvider } from "@/features/consultations/context/clinical-context";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <TenantProvider>
      <ClinicalProvider>
        <div className="flex h-full min-h-screen">
          {/* Desktop sidebar */}
          <Sidebar />

          {/* Main content area */}
          <div className="flex flex-1 flex-col overflow-x-hidden">
            <DashboardOnboardingGuard />

            <main className="flex-1 p-4 pb-24 pt-14 sm:p-6 sm:pt-6 lg:p-8 lg:pb-8 lg:pt-8">
              <div className="mx-auto w-full max-w-6xl">
                <div className="mb-4 space-y-3">
                  <GlobalSearch />
                  <SyncStatusBanner />
                </div>
                {children}
              </div>
            </main>
          </div>

          {/* Mobile top header (logo + logout) */}
          <MobileHeader />

          {/* Mobile bottom nav */}
          <BottomNav />
        </div>
      </ClinicalProvider>
    </TenantProvider>
  );
}
