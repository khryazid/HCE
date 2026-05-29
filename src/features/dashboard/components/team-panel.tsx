"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTenant } from "@/lib/supabase/tenant-context";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTeamRealtime } from "@/features/dashboard/lib/use-team-realtime";

export function TeamPanel() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();
  
  // ── Realtime: actualiza lista de miembros cuando algún admin hace cambios ─
  useTeamRealtime(tenant);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("assistant");
  const [inviteError, setInviteError] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["clinic-members", tenant?.clinic_id],
    queryFn: async () => {
      if (!tenant) return [];
      
      // 1. Get clinic members
      const { data: clinicMembers, error: membersError } = await supabase
        .from("clinic_members")
        .select("*")
        .eq("clinic_id", tenant.clinic_id);

      if (membersError) throw membersError;

      // 2. Add the owner (admin) who might not be in clinic_members explicitly
      // Actually, let's query all profiles for this clinic to get names
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("doctor_id, full_name")
        .eq("clinic_id", tenant.clinic_id);

      if (profilesError) throw profilesError;

      // Map doctor_id -> full_name
      const nameMap = new Map();
      profiles?.forEach((p) => nameMap.set(p.doctor_id, p.full_name));

      // Build the final list
      // 1. Explicit members
      const explicitMembers = (clinicMembers || []).map((m) => ({
        id: m.id,
        doctor_id: m.doctor_id,
        role: m.role,
        joined_at: m.joined_at,
        full_name: nameMap.get(m.doctor_id) || "Usuario Invitado",
      }));

      // 2. Identify implicit admins (profiles not in clinic_members)
      const explicitDoctorIds = new Set(explicitMembers.map(m => m.doctor_id));
      const implicitAdmins = (profiles || [])
        .filter(p => !explicitDoctorIds.has(p.doctor_id))
        .map(p => ({
          id: p.doctor_id, // fake id for implicit
          doctor_id: p.doctor_id,
          role: "admin",
          joined_at: new Date().toISOString(),
          full_name: p.full_name,
        }));

      return [...implicitAdmins, ...explicitMembers];
    },
    enabled: !!tenant?.clinic_id,
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      setInviteError("");
      const res = await fetch("/api/clinic/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          clinic_id: tenant?.clinic_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al invitar");
      return data;
    },
    onSuccess: () => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["clinic-members"] });
    },
    onError: (err: Error) => {
      setInviteError(err.message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/clinic/members/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al remover");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members"] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const res = await fetch(`/api/clinic/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar rol");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clinic-members"] });
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">Cargando equipo...</div>;
  }

  const isAdmin = tenant?.role === "admin";

  return (
    <div className="space-y-6">
      {isAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inviteEmail) inviteMutation.mutate();
          }}
          className="bg-background/50 p-4 rounded-lg border border-border space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 space-y-1 w-full">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="medico@ejemplo.com"
                className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>
            <div className="w-full sm:w-40 space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Rol</label>
              <select
                value={tenant?.plan === "individual" ? "assistant" : inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={tenant?.plan === "individual" || inviteMutation.isPending}
                className="w-full h-10 px-3 rounded-md border border-input bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent text-sm disabled:opacity-50"
              >
                {tenant?.plan === "clinic" && <option className="bg-bg text-ink" value="doctor">Doctor</option>}
                {tenant?.plan === "clinic" && <option className="bg-bg text-ink" value="admin">Admin</option>}
                <option className="bg-bg text-ink" value="assistant">Asistente</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="w-full sm:w-auto h-10 px-4 py-2 bg-primary text-primary-foreground font-medium rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 text-sm whitespace-nowrap"
            >
              {inviteMutation.isPending ? "Invitando..." : "Invitar miembro"}
            </button>
          </div>
          {tenant?.plan === "individual" && (
            <p className="text-[11px] text-muted-foreground leading-tight">
              * El plan individual solo permite invitar asistentes. Actualiza al plan clínica para invitar a otros médicos.
            </p>
          )}
        </form>
      )}

      {inviteError && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {inviteError}
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Rol</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-background">
            {members?.map((member) => (
              <tr key={member.id} className="group hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {member.full_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink flex items-center gap-2 flex-wrap">
                        <span className="truncate">{member.full_name}</span>
                        {member.doctor_id === tenant?.doctor_id && (
                          <span className="text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">Tú</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isAdmin && member.doctor_id !== tenant?.doctor_id ? (
                    <select
                      value={member.role}
                      onChange={(e) => updateRoleMutation.mutate({ id: member.id, role: e.target.value })}
                      disabled={(updateRoleMutation.isPending && updateRoleMutation.variables?.id === member.id) || tenant?.plan === "individual"}
                      className="h-8 px-2 rounded border border-border bg-bg text-ink text-xs focus:ring-2 focus:ring-accent disabled:opacity-50"
                    >
                      {tenant?.plan === "clinic" && <option className="bg-bg text-ink" value="admin">Admin</option>}
                      {tenant?.plan === "clinic" && <option className="bg-bg text-ink" value="doctor">Doctor</option>}
                      <option className="bg-bg text-ink" value="assistant">Asistente</option>
                    </select>
                  ) : (
                    <span className="capitalize text-muted-foreground">{member.role}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {isAdmin && member.doctor_id !== tenant?.doctor_id && (
                    <button
                      onClick={() => {
                        if (confirm("¿Seguro que deseas eliminar este miembro? Perderá acceso a la clínica.")) {
                          removeMutation.mutate(member.id);
                        }
                      }}
                      disabled={removeMutation.isPending}
                      className="text-destructive text-xs hover:underline disabled:opacity-50"
                    >
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {members?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No hay otros miembros en la clínica.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
