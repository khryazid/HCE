import { createAdminClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Crown, Activity } from "lucide-react";

/**
 * /platform/organizations/[id] — Organization detail view
 */
export default async function PlatformOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminClient = createAdminClient();

  // Fetch organization
  const { data: org } = await adminClient
    .from("clinics")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!org) notFound();

  // Fetch members
  const { data: members } = await adminClient
    .from("clinic_members")
    .select("id, doctor_id, role, is_active, custom_permissions, joined_at, created_at")
    .eq("clinic_id", id)
    .order("created_at", { ascending: true });

  // Fetch member profiles for names
  const memberIds = members?.map((m) => m.doctor_id) || [];
  const { data: profiles } = memberIds.length > 0
    ? await adminClient
        .from("profiles")
        .select("doctor_id, full_name, subscription_status")
        .in("doctor_id", memberIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles || []).map((p) => [p.doctor_id, p])
  );

  // Fetch invitations
  const { data: invitations } = await adminClient
    .from("invitations")
    .select("*")
    .eq("organization_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/platform/organizations"
          className="flex items-center gap-1 text-sm text-ink-soft hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {org.name || "Organización"}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                org.plan_type === "clinica"
                  ? "bg-indigo-50 text-indigo-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              Plan: {org.plan_type === "clinica" ? "Clínica" : "Individual"}
            </span>
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
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-bg-soft flex items-center gap-2">
          <Users className="w-4 h-4 text-ink-soft" />
          <h2 className="font-semibold text-ink">
            Miembros ({members?.length || 0})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-soft text-xs uppercase text-ink-soft border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold">Nombre</th>
                <th className="px-5 py-3 font-semibold">Rol</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold text-right">
                  Fecha de ingreso
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members?.map((member) => {
                const profile = profileMap.get(member.doctor_id);
                return (
                  <tr
                    key={member.id}
                    className="hover:bg-bg-soft transition-colors"
                  >
                    <td className="px-5 py-4 font-medium text-ink flex items-center gap-2">
                      {member.role === "owner" && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                      {profile?.full_name || "Usuario Pendiente"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 capitalize">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          member.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {member.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-ink-soft">
                      {member.joined_at
                        ? new Date(member.joined_at).toLocaleDateString("es")
                        : new Date(member.created_at).toLocaleDateString("es")}
                    </td>
                  </tr>
                );
              })}
              {(!members || members.length === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-ink-soft"
                  >
                    No hay miembros en esta organización.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invitations */}
      {invitations && invitations.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-bg-soft flex items-center gap-2">
            <Activity className="w-4 h-4 text-ink-soft" />
            <h2 className="font-semibold text-ink">
              Invitaciones ({invitations.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-bg-soft text-xs uppercase text-ink-soft border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Rol</th>
                  <th className="px-5 py-3 font-semibold">Estado</th>
                  <th className="px-5 py-3 font-semibold text-right">Expira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-bg-soft transition-colors">
                    <td className="px-5 py-4 font-medium text-ink">
                      {inv.email}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 capitalize">
                        {inv.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          inv.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : inv.status === "accepted"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-ink-soft">
                      {new Date(inv.expires_at).toLocaleDateString("es")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
