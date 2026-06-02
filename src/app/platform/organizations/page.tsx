import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Building2, ExternalLink } from "lucide-react";

/**
 * /platform/organizations — List all organizations
 */
export default async function PlatformOrganizationsPage() {
  const adminClient = createAdminClient();
  const { data: orgs, error } = await adminClient
    .from("clinics")
    .select("id, name, plan_type, subscription_status, created_at, owner_user_id, updated_at")
    .neq("name", "Platform Administration")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Organizaciones
        </h1>
        <p className="text-sm text-ink-soft mt-1">
          Todas las organizaciones registradas en la plataforma.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-soft text-xs uppercase text-ink-soft border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold">Creada</th>
                <th className="px-5 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orgs?.map((org) => (
                <tr key={org.id} className="hover:bg-bg-soft transition-colors">
                  <td className="px-5 py-4 font-medium text-ink flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-ink-soft" />
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
                  <td className="px-5 py-4 text-ink-soft">
                    {new Date(org.created_at).toLocaleDateString("es")}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/platform/organizations/${org.id}`}
                      className="inline-flex items-center gap-1 text-accent text-xs font-medium hover:underline"
                    >
                      Ver detalle <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
              {(!orgs || orgs.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-ink-soft">
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
