"use client";

import { useTenant } from "@/lib/supabase/tenant-context";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { useTeamList } from "@/features/clinic-admin/lib/use-clinic-admin";

const ROLE_LABELS: Record<string, string> = {
  owner: "Dueño",
  doctor: "Médico",
  assistant: "Asistente",
  clinic_admin: "Administrador",
  receptionist: "Recepcionista",
  lab: "Laboratorio",
  imaging: "Imagenología",
  surgery: "Cirugía",
};

export function EquipoClient() {
  const { tenant, loading, error } = useTenant();

  if (loading) return <DashboardSkeleton />;
  if (error || !tenant) {
    return (
      <div className="rounded-md bg-red-50 p-4 mt-4" role="alert">
        <p className="text-sm font-medium text-red-800">
          {error || "No se pudo cargar el contexto"}
        </p>
      </div>
    );
  }

  return <EquipoDashboard clinicId={tenant.clinic_id} />;
}

function EquipoDashboard({ clinicId }: { clinicId: string }) {
  const { data, isLoading } = useTeamList(clinicId);

  if (isLoading) return <DashboardSkeleton />;

  const members = data?.members ?? [];
  const invitations = data?.pendingInvitations ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Equipo de la Clínica</h1>
        <p className="text-sm text-ink-soft mt-1">
          Miembros activos e invitaciones pendientes
        </p>
      </div>

      {/* Active Members */}
      <div>
        <h2 className="text-lg font-semibold text-ink mb-3">
          Miembros Activos ({members.filter((m) => m.is_active).length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-ink-soft">Nombre</th>
                <th className="px-4 py-3 text-left font-medium text-ink-soft">Rol</th>
                <th className="px-4 py-3 text-left font-medium text-ink-soft">Estado</th>
                <th className="px-4 py-3 text-left font-medium text-ink-soft">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {members.map((m) => (
                <tr key={m.id} className="bg-white dark:bg-gray-900">
                  <td className="px-4 py-3 font-medium text-ink">
                    {m.profile?.full_name ?? "Desconocido"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
                      {ROLE_LABELS[m.role] ?? m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {m.is_active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {new Date(m.created_at).toLocaleDateString("es-DO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-ink mb-3">
            Invitaciones Pendientes ({invitations.length})
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-ink-soft">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-soft">Rol</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-soft">Expira</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {invitations.map((inv: any) => (
                  <tr key={inv.id} className="bg-white dark:bg-gray-900">
                    <td className="px-4 py-3 text-ink">{inv.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {ROLE_LABELS[inv.role] ?? inv.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {new Date(inv.expires_at).toLocaleDateString("es-DO")}
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
