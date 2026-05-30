import { createAdminClient } from "@/lib/supabase/server";
import {
  Building2,
  Users,
  CreditCard,
  TrendingUp,
  Activity,
} from "lucide-react";

/**
 * /platform/dashboard — Platform Admin Dashboard
 *
 * Shows global metrics:
 * - Active organizations
 * - Total users
 * - MRR (Monthly Recurring Revenue)
 * - Active subscriptions
 */
export default async function PlatformDashboardPage() {
  const adminClient = createAdminClient();

  // Fetch global metrics using service_role (bypasses RLS)
  // NOTE: New columns (plan_type, subscription_status on clinics; is_active on clinic_members)
  // are not yet in supabase.types.ts — cast through `any`.
  const ac = adminClient as any;
  const [orgResult, profileResult, memberResult] = await Promise.all([
    ac.from("clinics").select("id, subscription_status, plan_type", { count: "exact" }),
    adminClient.from("profiles").select("doctor_id, subscription_status", { count: "exact" }),
    ac.from("clinic_members").select("id, role, is_active", { count: "exact" }),
  ]);

  const totalOrgs = orgResult.count || 0;
  const activeOrgs = orgResult.data?.filter(
    (o: any) => o.subscription_status === "active" || o.subscription_status === "trial"
  ).length || 0;
  const totalUsers = profileResult.count || 0;
  const activeSubscriptions = profileResult.data?.filter(
    (p: any) => p.subscription_status === "active"
  ).length || 0;
  const totalMembers = memberResult.count || 0;
  const activeMembers = memberResult.data?.filter((m: any) => m.is_active).length || 0;

  const stats = [
    {
      label: "Organizaciones Activas",
      value: activeOrgs,
      total: totalOrgs,
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Usuarios Totales",
      value: totalUsers,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Suscripciones Activas",
      value: activeSubscriptions,
      icon: CreditCard,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Miembros de Equipos",
      value: activeMembers,
      total: totalMembers,
      icon: Activity,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  // Recent organizations
  const { data: recentOrgs } = await ac
    .from("clinics")
    .select("id, name, plan_type, subscription_status, created_at, owner_user_id")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Dashboard de Plataforma
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Vista global de todas las organizaciones, usuarios y suscripciones.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-5 flex items-center gap-4"
          >
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-ink-soft font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-ink">
                {stat.value}
                {stat.total !== undefined && (
                  <span className="text-sm font-normal text-ink-soft ml-1">
                    / {stat.total}
                  </span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Organizations */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-bg-soft">
          <h2 className="font-semibold text-lg text-ink">
            Organizaciones Recientes
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-soft text-xs uppercase text-ink-soft border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold text-right">Creada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recentOrgs?.map((org: any) => (
                <tr key={org.id} className="hover:bg-bg-soft transition-colors">
                  <td className="px-5 py-4 font-medium text-ink">
                    {org.name || "Sin nombre"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        org.plan_type === "clinica"
                          ? "bg-indigo-50 text-indigo-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {org.plan_type === "clinica" ? "Clínica" : "Individual"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        org.subscription_status === "active"
                          ? "bg-green-50 text-green-700"
                          : org.subscription_status === "trial"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {org.subscription_status || "trial"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-ink-soft">
                    {new Date(org.created_at).toLocaleDateString("es")}
                  </td>
                </tr>
              ))}
              {(!recentOrgs || recentOrgs.length === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-ink-soft"
                  >
                    No hay organizaciones registradas.
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
