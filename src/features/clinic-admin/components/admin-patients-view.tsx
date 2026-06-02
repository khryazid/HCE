"use client";

import React from "react";
import { usePatients } from "@/features/patients/lib/use-patients-queries";
import { useTenant } from "@/lib/supabase/tenant-context";
import { Card } from "@/components/ui/card";
import { Users, UserCheck, Calendar, Activity } from "lucide-react";
import { useClinicMembers } from "@/features/clinic-admin/lib/use-clinic-admin";

export function AdminPatientsView() {
  const { tenant } = useTenant();
  const { data: patients = [], isLoading: loadingPatients } = usePatients(tenant);
  const { data: members = [] } = useClinicMembers(tenant?.clinic_id || "");

  if (loadingPatients) {
    return <div className="p-8 text-center text-ink-soft animate-pulse">Cargando padrón global de pacientes...</div>;
  }

  const activePatients = patients.filter(p => p.status === "activo");
  const inactivePatients = patients.filter(p => p.status !== "activo");

  const patientsByDoctor: Record<string, number> = {};
  patients.forEach(p => {
    // If we have a created_by or primary_doctor we could group. 
    // Right now, since patient is generic, we just show global stats.
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-ink">Padrón Global de Pacientes</h2>
        <p className="text-sm text-ink-soft">Vista gerencial de todos los pacientes atendidos en la clínica.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-medium">Total Registrados</p>
            <p className="text-2xl font-bold">{patients.length}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <UserCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-medium">Pacientes Activos</p>
            <p className="text-2xl font-bold">{activePatients.length}</p>
          </div>
        </Card>

        <Card className="p-5 flex items-center gap-4">
          <div className="p-3 bg-gray-50 text-gray-600 rounded-lg">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm text-ink-soft font-medium">Pacientes Inactivos</p>
            <p className="text-2xl font-bold">{inactivePatients.length}</p>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden mt-6">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-semibold text-lg">Directorio Consolidado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-xs uppercase text-ink-soft border-b border-gray-100">
              <tr>
                <th className="px-5 py-3 font-semibold">Nombre del Paciente</th>
                <th className="px-5 py-3 font-semibold">Identificación</th>
                <th className="px-5 py-3 font-semibold">Teléfono</th>
                <th className="px-5 py-3 font-semibold text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {patients.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-ink-soft">
                    No hay pacientes registrados en la clínica aún.
                  </td>
                </tr>
              ) : (
                patients.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-4 font-medium text-ink">{p.full_name}</td>
                    <td className="px-5 py-4 text-ink-soft">{p.document_number || "N/A"}</td>
                    <td className="px-5 py-4 text-ink-soft">{p.phone || "N/A"}</td>
                    <td className="px-5 py-4 text-right">
                      {p.status === "activo" ? (
                        <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">Activo</span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-xs font-medium text-gray-600 capitalize">{p.status}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
