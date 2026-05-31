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
  const [invitePassword, setInvitePassword] = useState("");
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
          password: invitePassword ? invitePassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al invitar");
      return data;
    },
    onSuccess: () => {
      setInviteEmail("");
      setInvitePassword("");
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

  const isAdmin = tenant?.role === "owner" || tenant?.role === "clinic_admin";

  // ── Limits logic ──
  const PLAN_LIMITS: Record<string, { maxDoctors: number; maxAssistants: number }> = {
    basic:      { maxDoctors: 0,   maxAssistants: 2  },
    clinic:     { maxDoctors: 5,   maxAssistants: 10 },
    enterprise: { maxDoctors: 999, maxAssistants: 999 },
  };

  const plan = tenant?.plan || "basic";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.basic;

  const currentAssistantsCount = members?.filter((m) => m.role === "assistant").length || 0;
  const remainingAssistants = Math.max(0, limits.maxAssistants - currentAssistantsCount);
  const assistantsLimitReached = remainingAssistants === 0;

  const currentDoctorsCount = members?.filter((m) => m.role === "doctor" && m.doctor_id !== tenant?.doctor_id).length || 0;
  const remainingDoctors = Math.max(0, limits.maxDoctors - currentDoctorsCount);
  const doctorsLimitReached = remainingDoctors === 0;
  
  // Decide if submit is disabled based on role selected
  const isSubmitDisabled = 
    inviteMutation.isPending ||
    (inviteRole === "assistant" && assistantsLimitReached) ||
    (inviteRole === "doctor" && doctorsLimitReached);

  return (
    <div className="space-y-6">
      {isAdmin && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inviteEmail) inviteMutation.mutate();
          }}
          className="bg-card/40 p-5 rounded-2xl border border-border/60 shadow-sm space-y-5 backdrop-blur-sm"
        >
          <div>
             <h3 className="text-sm font-semibold text-ink mb-1">Añadir nuevo miembro</h3>
             <p className="text-xs text-ink-soft">Ingresa el correo, asóciale un rol, y opcionalmente crea su clave de acceso directo.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 space-y-1.5 w-full">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Email del médico/asistente</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="medico@ejemplo.com"
                className="w-full h-11 px-4 rounded-xl border border-input/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all shadow-sm"
              />
            </div>
            <div className="w-full sm:w-48 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Clave temporal</label>
              <input
                type="text"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder="(Opcional)"
                className="w-full h-11 px-4 rounded-xl border border-input/60 bg-background/50 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm transition-all shadow-sm"
              />
            </div>
            <div className="w-full sm:w-36 space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Rol</label>
              <select
                value={tenant?.plan === "basic" ? "assistant" : inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                disabled={tenant?.plan === "basic" || inviteMutation.isPending}
                className="w-full h-11 px-3 rounded-xl border border-input/60 bg-background/50 text-ink focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent text-sm disabled:opacity-50 transition-all appearance-none shadow-sm font-medium"
              >
                {tenant?.plan === "clinic" && <option className="bg-bg text-ink" value="doctor">Doctor</option>}
                {tenant?.plan === "clinic" && <option className="bg-bg text-ink" value="admin">Admin</option>}
                <option className="bg-bg text-ink" value="assistant">Asistente</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full sm:w-auto h-11 px-6 bg-ink text-bg font-semibold rounded-xl hover:bg-ink/90 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 disabled:opacity-50 text-sm whitespace-nowrap transition-all shadow-sm"
            >
              {inviteMutation.isPending ? "Invitando..." : "Invitar miembro"}
            </button>
          </div>
          <div className="flex flex-col gap-1.5 pt-1">
            <p className={`text-[11px] font-semibold leading-tight flex items-center gap-1.5 ${assistantsLimitReached ? 'text-red-500/90' : 'text-emerald-600/90'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${assistantsLimitReached ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
              Espacio para asistentes: {remainingAssistants} de {limits.maxAssistants} disponibles.
            </p>
            {tenant?.plan === "basic" && (
              <p className="text-[11px] text-accent/80 font-medium leading-tight flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-accent/80"></span>
                El plan individual solo permite invitar asistentes. Actualiza al plan clínica para invitar a médicos.
              </p>
            )}
          </div>
        </form>
      )}

      {inviteError && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
          {inviteError}
        </div>
      )}

      <div className="bg-card/40 border border-border/60 rounded-2xl overflow-hidden shadow-sm backdrop-blur-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/30 text-muted-foreground font-semibold border-b border-border/60">
            <tr>
              <th className="px-5 py-4 text-xs uppercase tracking-wider">Nombre</th>
              <th className="px-5 py-4 text-xs uppercase tracking-wider">Rol</th>
              <th className="px-5 py-4 text-right text-xs uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60 bg-transparent">
            {members?.map((member) => (
              <tr key={member.id} className="group hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center font-bold text-sm">
                      {member.full_name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink flex items-center gap-2 flex-wrap text-sm">
                        <span className="truncate">{member.full_name}</span>
                        {member.doctor_id === tenant?.doctor_id && (
                          <span className="text-[10px] font-bold text-accent bg-accent/10 px-2.5 py-0.5 rounded-md whitespace-nowrap shrink-0">Tú</span>
                        )}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  {isAdmin && member.doctor_id !== tenant?.doctor_id ? (
                    <select
                      value={member.role}
                      onChange={(e) => updateRoleMutation.mutate({ id: member.id, role: e.target.value })}
                      disabled={(updateRoleMutation.isPending && updateRoleMutation.variables?.id === member.id) || tenant?.plan === "basic"}
                      className="h-9 px-3 rounded-lg border border-input/60 bg-background/50 text-ink text-xs focus:ring-2 focus:ring-accent disabled:opacity-50 font-medium transition-all"
                    >
                      {tenant?.plan === "clinic" && <option className="bg-bg text-ink" value="admin">Admin</option>}
                      {tenant?.plan === "clinic" && <option className="bg-bg text-ink" value="doctor">Doctor</option>}
                      <option className="bg-bg text-ink" value="assistant">Asistente</option>
                    </select>
                  ) : (
                    <span className="capitalize text-muted-foreground font-medium text-xs bg-muted/50 px-3 py-1.5 rounded-lg">{member.role}</span>
                  )}
                </td>
                <td className="px-5 py-4 text-right">
                  {isAdmin && member.doctor_id !== tenant?.doctor_id && (
                    <button
                      onClick={() => {
                        if (confirm("¿Seguro que deseas eliminar este miembro? Perderá acceso a la clínica.")) {
                          removeMutation.mutate(member.id);
                        }
                      }}
                      disabled={removeMutation.isPending}
                      className="text-red-500/80 font-medium text-xs hover:text-red-600 transition-colors disabled:opacity-50 bg-red-500/10 px-3 py-1.5 rounded-lg hover:bg-red-500/20"
                    >
                      Remover
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {members?.length === 0 && (
              <tr>
                <td colSpan={3} className="px-5 py-12 text-center text-muted-foreground text-sm font-medium">
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
