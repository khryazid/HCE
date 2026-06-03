import React, { useState } from "react";
import { useClinicMembers, useClinicStats } from "../lib/use-clinic-admin";
import { Card } from "@/components/ui/card";
import { Loader2, Users, FileText, UserPlus, TrendingUp, Settings, Crown, Activity, Star, BarChart3, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { InviteClinicMemberModal } from "./invite-clinic-member-modal";

interface ClinicAdminViewProps {
  clinicId: string;
}

export function ClinicAdminView({ clinicId }: ClinicAdminViewProps) {
  const { data: members, isLoading: loadingMembers, error: errorMembers } = useClinicMembers(clinicId);
  const { data: stats, isLoading: loadingStats } = useClinicStats(clinicId);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  if (loadingMembers || loadingStats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (errorMembers) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Error al cargar datos de la clínica</p>
        <p className="text-sm">{(errorMembers as Error).message}</p>
      </div>
    );
  }

  const activeDoctors = members?.filter(m => (m.role === "owner" || m.role === "doctor")).length || 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <InviteClinicMemberModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        clinicId={clinicId} 
      />
      
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-end pb-6 border-b border-border/50">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">Dashboard Clínico</h2>
          <p className="text-base text-ink-soft mt-1.5 max-w-xl">
            Centro de control administrativo. Gestiona tu equipo, visualiza métricas de rendimiento y configura la clínica.
          </p>
        </div>
        
        <Button 
          className="flex items-center gap-2 shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 transition-all hover:-translate-y-0.5" 
          onClick={() => setIsInviteModalOpen(true)}
        >
          <UserPlus className="h-4 w-4" />
          Invitar Miembro
        </Button>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden p-4 sm:p-6 border-border/50 shadow-sm transition-all hover:shadow-md group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
            <Users className="h-16 w-16 sm:h-24 sm:w-24 text-blue-600" />
          </div>
          <div className="relative z-10">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 mb-3 sm:mb-4 ring-1 ring-blue-500/20">
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="text-sm font-medium text-ink-soft">Pacientes Totales</p>
            <p className="text-3xl font-bold text-ink mt-1 tracking-tight">{stats?.totalPatients || 0}</p>
          </div>
        </Card>
        
        <Card className="relative overflow-hidden p-4 sm:p-6 border-border/50 shadow-sm transition-all hover:shadow-md group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
            <FileText className="h-16 w-16 sm:h-24 sm:w-24 text-indigo-600" />
          </div>
          <div className="relative z-10">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-3 sm:mb-4 ring-1 ring-indigo-500/20">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="text-sm font-medium text-ink-soft">Consultas Realizadas</p>
            <p className="text-3xl font-bold text-ink mt-1 tracking-tight">{stats?.totalConsultations || 0}</p>
          </div>
        </Card>
        
        <Card className="relative overflow-hidden p-4 sm:p-6 border-border/50 shadow-sm transition-all hover:shadow-md group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
            <TrendingUp className="h-16 w-16 sm:h-24 sm:w-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-3 sm:mb-4 ring-1 ring-emerald-500/20">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="text-sm font-medium text-ink-soft">Ingresos del Mes</p>
            <p className="text-3xl font-bold text-emerald-600 mt-1 tracking-tight drop-shadow-sm">
              ${stats?.monthlyIncome.toFixed(2) || "0.00"}
            </p>
          </div>
        </Card>

        <Card className="relative overflow-hidden p-4 sm:p-6 border-border/50 shadow-sm transition-all hover:shadow-md group bg-gradient-to-br from-bg to-bg-soft">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
            <Activity className="h-16 w-16 sm:h-24 sm:w-24 text-accent" />
          </div>
          <div className="relative z-10">
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-3 sm:mb-4 ring-1 ring-accent/20">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <p className="text-sm font-medium text-ink-soft">Médicos Activos</p>
            <p className="text-3xl font-bold text-ink mt-1 tracking-tight">{activeDoctors}</p>
          </div>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col border-border/50 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-4 sm:p-5 bg-bg-soft/30 border-b border-border/50 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-amber-100/50 rounded-lg text-amber-600 ring-1 ring-amber-500/20">
              <Star className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <h3 className="font-semibold text-lg text-ink tracking-tight">Mejores Médicos</h3>
          </div>
          <div className="p-4 sm:p-5 flex-1 bg-white">
            {!stats?.topDoctors || stats.topDoctors.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-soft/60">
                <Users className="h-10 w-10 mb-3 opacity-20" />
                <p>Aún no hay suficientes datos para generar este ranking.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.topDoctors.map((doc, idx) => {
                  const member = members?.find(m => m.doctor_id === doc.doctor_id);
                  const name = member?.doctor_profile?.full_name || "Médico Pendiente";
                  return (
                    <div key={doc.doctor_id} className="flex justify-between items-center group p-2.5 rounded-xl hover:bg-bg-soft/50 transition-colors border border-transparent hover:border-border/50">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl font-bold text-sm shadow-sm
                          ${idx === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/20' : 
                            idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-white' : 
                            idx === 2 ? 'bg-gradient-to-br from-amber-700 to-amber-800 text-white' : 
                            'bg-bg-soft text-ink-soft ring-1 ring-border'}`}>
                          {idx + 1}
                        </div>
                        <span className="font-medium text-ink group-hover:text-accent transition-colors">{name}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-border/80 shadow-sm">
                        <span className="text-sm font-bold text-ink">{doc.count}</span>
                        <span className="text-xs font-medium text-ink-soft">consultas</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col border-border/50 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-4 sm:p-5 bg-bg-soft/30 border-b border-border/50 flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-indigo-100/50 rounded-lg text-indigo-600 ring-1 ring-indigo-500/20">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <h3 className="font-semibold text-lg text-ink tracking-tight">Distribución por Especialidad</h3>
          </div>
          <div className="p-4 sm:p-6 flex-1 bg-white">
            {!stats?.topSpecialties || stats.topSpecialties.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-ink-soft/60">
                <BarChart3 className="h-10 w-10 mb-3 opacity-20" />
                <p>Las consultas por especialidad aparecerán aquí.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {stats.topSpecialties.map((spec, idx) => {
                  const maxCount = Math.max(...stats.topSpecialties.map(s => s.count));
                  const percentage = Math.round((spec.count / maxCount) * 100);
                  return (
                    <div key={spec.specialty} className="space-y-2 group">
                      <div className="flex justify-between items-end">
                        <span className="font-semibold text-sm text-ink capitalize group-hover:text-accent transition-colors">{spec.specialty}</span>
                        <span className="text-xs font-bold text-ink-soft bg-bg-soft px-2 py-0.5 rounded-md">{spec.count} consultas</span>
                      </div>
                      <div className="h-2.5 w-full bg-bg-soft rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Departments Performance */}
      <Card className="border-border/50 shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="p-4 sm:p-5 bg-bg-soft/30 border-b border-border/50 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-purple-100/50 rounded-lg text-purple-600 ring-1 ring-purple-500/20">
            <FlaskConical className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <h3 className="font-semibold text-lg text-ink tracking-tight">Rendimiento Departamental</h3>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-border/50 bg-white">
          
          {/* Lab */}
          <div className="space-y-5 md:pr-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/20 shadow-sm">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <h4 className="font-bold text-ink text-lg tracking-tight">Laboratorio Clínico</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50/20 border border-emerald-100/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow group">
                <p className="text-xs uppercase tracking-wider text-emerald-700/80 font-bold mb-1.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Ingresos
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">${(stats as any)?.labMetrics?.labIncome?.lab?.toFixed(2) || "0.00"}</p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-red-50/20 border border-rose-100/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow group">
                <p className="text-xs uppercase tracking-wider text-rose-700/80 font-bold mb-1.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span> Egresos
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 tracking-tight">${(stats as any)?.labMetrics?.labExpense?.lab?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </div>

          {/* Imaging */}
          <div className="space-y-5 md:pl-8 pt-6 md:pt-0">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 shadow-sm">
                <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <h4 className="font-bold text-ink text-lg tracking-tight">Imagenología</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50/20 border border-emerald-100/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow group">
                <p className="text-xs uppercase tracking-wider text-emerald-700/80 font-bold mb-1.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Ingresos
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700 tracking-tight">${(stats as any)?.labMetrics?.labIncome?.imaging?.toFixed(2) || "0.00"}</p>
              </div>
              <div className="bg-gradient-to-br from-rose-50 to-red-50/20 border border-rose-100/80 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow group">
                <p className="text-xs uppercase tracking-wider text-rose-700/80 font-bold mb-1.5 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span> Egresos
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-rose-700 tracking-tight">${(stats as any)?.labMetrics?.labExpense?.imaging?.toFixed(2) || "0.00"}</p>
              </div>
            </div>
          </div>

        </div>
      </Card>

      {/* Bottom Section: Team & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-24">
        
        {/* Team Table */}
        <Card className="col-span-1 lg:col-span-2 flex flex-col border-border/50 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="p-4 sm:p-5 bg-bg-soft/30 border-b border-border/50 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-blue-100/50 rounded-lg text-blue-600 ring-1 ring-blue-500/20 shrink-0">
                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="font-semibold text-base sm:text-lg text-ink tracking-tight truncate">Directorio del Equipo</h3>
            </div>
            <span className="text-xs font-bold bg-accent/10 text-accent px-3 py-1.5 rounded-full ring-1 ring-accent/20 whitespace-nowrap shrink-0">
              {members?.length || 0} Miembros
            </span>
          </div>
          
          <div className="overflow-x-auto bg-white">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-bg-soft/20 text-xs uppercase text-ink-soft/70 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Profesional</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Permisos</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Especialidad</th>
                  <th className="px-6 py-4 font-bold tracking-wider text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {members?.map(member => (
                  <tr key={member.id} className="hover:bg-bg-soft/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-ink flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-accent font-bold ring-1 ring-accent/20 group-hover:ring-accent/40 group-hover:scale-105 transition-all shadow-sm">
                        {member.doctor_profile?.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold group-hover:text-accent transition-colors">{member.doctor_profile?.full_name || "Usuario Pendiente"}</span>
                          {member.role === "owner" && <Crown className="h-4 w-4 text-amber-500" />}
                        </div>
                        <span className="text-xs text-ink-soft/70 font-medium">ID: {member.id.substring(0,8)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold capitalize border shadow-sm
                        ${member.role === 'owner' ? 'bg-amber-50 text-amber-700 border-amber-200/50' : 
                          member.role === 'doctor' ? 'bg-blue-50 text-blue-700 border-blue-200/50' : 
                          'bg-gray-50 text-gray-700 border-gray-200/50'}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-ink-soft font-medium">
                      {member.doctor_profile?.specialties?.join(", ") || "—"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50/80 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/50 shadow-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                          Activo
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Settings Card */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-6 border-border/50 shadow-sm h-full flex flex-col bg-gradient-to-br from-white to-bg-soft/50 transition-all hover:shadow-md relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500">
              <Settings className="h-20 w-20 sm:h-32 sm:w-32 text-ink" />
            </div>
            
            <h3 className="font-semibold text-lg mb-6 flex items-center gap-2 sm:gap-3 relative z-10">
              <div className="p-1.5 sm:p-2 bg-gray-100 rounded-lg text-gray-600 shadow-inner ring-1 ring-gray-200">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <span className="tracking-tight text-ink">Configuración</span>
            </h3>
            
            <div className="space-y-4 flex-1 relative z-10">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-border/80 shadow-sm group/plan hover:border-accent/40 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 sm:gap-3 mb-4">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 ring-1 ring-blue-500/20 group-hover/plan:scale-110 transition-transform">
                    <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h4 className="font-bold text-sm text-ink-soft uppercase tracking-wider">Plan Actual</h4>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-extrabold text-ink tracking-tight">Clínica</span>
                  <span className="text-xs text-ink-soft font-bold bg-bg-soft px-2.5 py-1 rounded-md ring-1 ring-border">Multi-usuario</span>
                </div>
              </div>

              <Link href="/billing" className="block w-full mt-auto pt-4">
                <Button variant="outline" className="w-full justify-between bg-white border-border/80 shadow-sm hover:border-accent/50 hover:text-accent hover:shadow-md transition-all h-auto py-3 sm:py-4 sm:h-14 rounded-xl font-medium">
                  <span className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base whitespace-normal text-left">
                    <div className="p-1.5 bg-bg-soft rounded-md shrink-0">
                      <FileText className="h-4 w-4 text-ink-soft" />
                    </div>
                    Suscripción y Pagos
                  </span>
                  <span className="text-accent text-lg shrink-0">→</span>
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
