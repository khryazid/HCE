import { createAdminClient } from "@/lib/supabase/server";
import { Users, Search, Ban } from "lucide-react";
import Link from "next/link";

export default async function PlatformUsersPage() {
  const adminClient = createAdminClient();

  // Fetch all profiles excluding platform admins
  const { data: profiles } = await adminClient
    .from("profiles")
    .select(`
      doctor_id,
      full_name,
      specialty,
      created_at,
      subscription_status,
      clinics!inner (
        id,
        name
      )
    `)
    .neq("is_platform_admin", true)
    .order("created_at", { ascending: false });

  // Fetch all clinic_members to determine roles
  const { data: members } = await adminClient
    .from("clinic_members")
    .select("doctor_id, role, is_active");

  // Fetch Auth Users to get Emails (limited to first page of 500 for simplicity in this MVP)
  const { data: authUsersResponse } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 500,
  });
  
  const emailMap = new Map<string, string>();
  authUsersResponse.users.forEach((u) => {
    if (u.email) emailMap.set(u.id, u.email);
  });

  // Map roles
  const roleMap = new Map<string, { role: string; isActive: boolean }>();
  members?.forEach((m) => {
    roleMap.set(m.doctor_id, { role: m.role, isActive: m.is_active });
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-ink flex items-center gap-3">
            <Users className="w-8 h-8 text-accent" />
            Directorio de Usuarios
          </h1>
          <p className="text-sm text-ink-soft mt-1">
            Gestión global de todos los usuarios registrados en la plataforma.
          </p>
        </div>
        
        {/* Placeholder for future search/filter */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
            <input 
              type="text" 
              placeholder="Buscar usuario..." 
              className="pl-9 pr-4 py-2 border border-border rounded-lg bg-bg-soft text-sm focus:outline-none focus:ring-2 focus:ring-accent w-64"
              disabled
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-bg-soft text-xs uppercase text-ink-soft border-b border-border">
              <tr>
                <th className="px-5 py-3 font-semibold">Usuario</th>
                <th className="px-5 py-3 font-semibold">Organización</th>
                <th className="px-5 py-3 font-semibold">Rol</th>
                <th className="px-5 py-3 font-semibold">Estado de Plan</th>
                <th className="px-5 py-3 font-semibold text-right">Registro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {profiles?.map((profile) => {
                const email = emailMap.get(profile.doctor_id) || "Email no disponible";
                const memberInfo = roleMap.get(profile.doctor_id) || { role: "owner", isActive: true };
                
                // Tratar arrays de PostgreSQL que vienen desde Supabase JS
                const clinicData = Array.isArray(profile.clinics) ? profile.clinics[0] : profile.clinics;
                const clinicName = clinicData?.name || "Desconocida";
                
                return (
                  <tr key={profile.doctor_id} className="hover:bg-bg-soft transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-medium text-ink">{profile.full_name}</div>
                      <div className="text-xs text-ink-soft mt-0.5">{email}</div>
                    </td>
                    <td className="px-5 py-4 text-ink-soft">
                      {clinicName}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                        {memberInfo.role}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          profile.subscription_status === "active"
                            ? "bg-green-50 text-green-700"
                            : profile.subscription_status === "trial" || profile.subscription_status === "trialing"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {profile.subscription_status || "trial"}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-ink-soft flex items-center justify-end gap-4">
                      <span className="group-hover:hidden">
                        {new Date(profile.created_at).toLocaleDateString("es")}
                      </span>
                      {/* Hover Action */}
                      <button className="hidden group-hover:flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                        <Ban className="w-3 h-3" />
                        Bloquear
                      </button>
                    </td>
                  </tr>
                );
              })}
              {(!profiles || profiles.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-ink-soft">
                    <Users className="w-10 h-10 mx-auto text-border mb-3" />
                    No hay usuarios registrados en el sistema.
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
