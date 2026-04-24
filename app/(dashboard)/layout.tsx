import { DashboardOnboardingGuard } from "@/components/ui/dashboard-onboarding-guard";
import { Sidebar, BottomNav } from "@/components/ui/sidebar";
import { TenantProvider } from "@/lib/supabase/tenant-context";
import { ClinicalProvider } from "@/lib/context/clinical-context";

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

            <main className="flex-1 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
              <div className="mx-auto w-full max-w-6xl">
                {children}
              </div>
            </main>
          </div>

          {/* Mobile bottom nav */}
          <BottomNav />
        </div>
      </ClinicalProvider>
    </TenantProvider>
  );
}
