import React from "react";
import { useClinicMembers, useClinicStats } from "../lib/use-clinic-admin";
import { Card } from "@/components/ui/card";
import { Loader2, Users, FileText, UserPlus, TrendingUp, Settings, Crown, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClinicAdminViewProps {
  clinicId: string;
}

export function ClinicAdminView({ clinicId }: ClinicAdminViewProps) {
  const { data: members, isLoading: loadingMembers, error: errorMembers } = useClinicMembers(clinicId);
  const { data: stats, isLoading: loadingStats } = useClinicStats(clinicId);

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

  const activeDoctors = members?.filter(m => m.doctor_profile?.is_active && (m.role === "admin" || m.role === "doctor")).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Dashboard de la Clínica</h2>
          <p className="text-sm text-ink-soft">Administra miembros, métricas y configuración general de la clínica.</p>
        </div>
        
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Invitar Miembro
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-medium">Pacientes Totales</p>
            <p className="text-2xl font-bold">{stats?.totalPatients || 0}</p>
          </div>
        </Card>
        
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-medium">Consultas Realizadas</p>
            <p className="text-2xl font-bold">{stats?.totalConsultations || 0}</p>
          </div>
        </Card>
        
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-medium">Ingresos del Mes</p>
            <p className="text-2xl font-bold">${stats?.monthlyIncome.toFixed(2) || "0.00"}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-medium">Médicos Activos</p>
            <p className="text-2xl font-bold">{activeDoctors}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="col-span-1 lg:col-span-2 p-0 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-semibold text-lg">Miembros del Equipo</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-xs uppercase text-ink-soft border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 font-semibold">Nombre</th>
                  <th className="px-5 py-3 font-semibold">Rol</th>
                  <th className="px-5 py-3 font-semibold">Especialidad</th>
                  <th className="px-5 py-3 font-semibold text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members?.map(member => (
                  <tr key={member.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-medium flex items-center gap-2">
                      {member.role === "admin" && <Crown className="h-4 w-4 text-amber-500" />}
                      {member.doctor_profile?.full_name || "Usuario Pendiente"}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 capitalize">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-ink-soft">
                      {member.doctor_profile?.specialties?.join(", ") || "N/A"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {member.doctor_profile?.is_active ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Activo</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600">Inactivo</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-ink-soft" /> Configuración
            </h3>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start text-left">
                Editar Datos de la Clínica
              </Button>
              <Button variant="outline" className="w-full justify-start text-left">
                Configurar Membrete Global
              </Button>
              <Button variant="outline" className="w-full justify-start text-left">
                Suscripción y Facturación (Stripe)
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
