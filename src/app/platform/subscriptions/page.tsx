import { createAdminClient } from "@/lib/supabase/server";
import { CreditCard, CalendarDays, ExternalLink, ShieldCheck } from "lucide-react";
import { SubscriptionActions } from "./subscription-actions";

export default async function PlatformSubscriptionsPage() {
  const adminClient = createAdminClient();

  // Fetch all clinics and their owners
  const { data: clinics } = await adminClient
    .from("clinics")
    .select(`
      id,
      name,
      plan_type,
      subscription_status,
      created_at,
      profiles (
        doctor_id,
        full_name,
        stripe_customer_id,
        stripe_subscription_id,
        subscription_expires_at,
        is_platform_admin
      )
    `)
    .neq("name", "Platform Administration")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-accent" />
            Suscripciones y Pagos
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Gestión financiera de los planes y facturación de todas las organizaciones.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-soft text-xs uppercase text-ink-soft border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold">Organización / Titular</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Stripe ID</th>
                <th className="px-5 py-3 font-semibold text-right">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clinics?.map((clinic) => {
                // Ensure we grab the owner's profile (since profiles is an array in one-to-many from clinic)
                const profiles = Array.isArray(clinic.profiles) ? clinic.profiles : [];
                // We'll just display the first profile that has a stripe customer ID or fallback to the first one
                const ownerProfile = profiles.find((p) => p.stripe_customer_id) || profiles[0];
                
                return (
                  <tr key={clinic.id} className="hover:bg-bg-soft transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-medium text-ink">{clinic.name}</div>
                      <div className="text-xs text-ink-soft mt-0.5">
                        {ownerProfile ? ownerProfile.full_name : "Sin titular asignado"}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {clinic.plan_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          clinic.subscription_status === "active"
                            ? "bg-green-50 text-green-700"
                            : clinic.subscription_status === "trial" || clinic.subscription_status === "trialing"
                            ? "bg-amber-50 text-amber-700"
                            : clinic.subscription_status === "lifetime"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {clinic.subscription_status || "trial"}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-soft">
                      {ownerProfile?.stripe_customer_id ? (
                        <div className="flex items-center gap-1.5 hover:text-accent cursor-pointer">
                          {ownerProfile.stripe_customer_id.slice(0, 10)}...
                          <ExternalLink className="w-3 h-3" />
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right text-ink-soft flex items-center justify-end gap-4">
                      <span className="group-hover:hidden">
                        {ownerProfile?.subscription_expires_at 
                          ? new Date(ownerProfile.subscription_expires_at).toLocaleDateString("es") 
                          : "Ilimitado"}
                      </span>
                      
                      {/* Hover Actions */}
                      <SubscriptionActions 
                        clinicId={clinic.id} 
                        currentStatus={clinic.subscription_status || "trial"}
                        currentPlan={clinic.plan_type || "basic"}
                      />
                    </td>
                  </tr>
                );
              })}
              {(!clinics || clinics.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-ink-soft">
                    <CreditCard className="w-10 h-10 mx-auto text-border mb-3" />
                    No hay organizaciones con suscripción.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
