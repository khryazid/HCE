"use client";

import { FlaskConical } from "lucide-react";
import { LabSettingsPanel } from "@/features/lab-orders/components/lab-settings-panel";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function LaboratorioAjustesClient() {
  const { tenant, loading } = useTenant();
  const router = useRouter();

  useEffect(() => {
    if (!loading && tenant) {
      // Solo lab, clinic_admin, y owner pueden ver esto
      const allowedRoles = ["lab", "clinic_admin", "owner"];
      if (!allowedRoles.includes(tenant.role)) {
        router.replace("/dashboard");
      }
    }
  }, [loading, tenant, router]);

  if (loading) return null;

  return (
    <div className="flex flex-col gap-8 w-full hce-page max-w-5xl mx-auto lg:flex-row">
      {/* Sidebar Navigation (Simple) */}
      <aside className="lg:w-64 shrink-0">
        <div className="sticky top-24">
          <div className="mb-6 px-3">
            <h1 className="text-2xl font-bold text-ink tracking-tight mb-1">Ajustes Lab</h1>
            <p className="text-sm text-ink-soft">Configura tu área de laboratorio</p>
          </div>
          <nav className="flex flex-col gap-1">
            <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors bg-accent/10 text-accent">
              <FlaskConical className="w-4 h-4" />
              <span>Catálogo y Membrete</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 pb-24">
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <LabSettingsPanel />
        </div>
      </main>
    </div>
  );
}
