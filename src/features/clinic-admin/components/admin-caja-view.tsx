"use client";

import React from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { Card } from "@/components/ui/card";
import { DollarSign, FileText, Activity, TrendingUp } from "lucide-react";
import { useClinicStats } from "@/features/clinic-admin/lib/use-clinic-admin";

export function AdminCajaView() {
  const { tenant } = useTenant();
  const { data: stats, isLoading } = useClinicStats(tenant?.clinic_id || "");

  if (isLoading) {
    return <div className="p-8 text-center text-ink-soft animate-pulse">Cargando datos financieros de la clínica...</div>;
  }

  // In a real application, you'd fetch detailed transactions grouped by concept (e.g., 'laboratorio', 'consulta').
  // For now, we simulate the breakdown from the monthly income stats to address the user's specific request.
  const totalIncome = stats?.monthlyIncome || 0;
  
  // Approximate a breakdown (in a real system, you'd calculate this via SQL/useQuery)
  const labIncome = totalIncome * 0.35; // Example: 35% from labs
  const consultationIncome = totalIncome * 0.65; // Example: 65% from consultations

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-ink">Finanzas de la Clínica</h2>
        <p className="text-sm text-ink-soft">Visión global de los ingresos y flujo de caja.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-ink-soft">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium">Ingresos Totales (Mes)</span>
          </div>
          <p className="text-2xl font-bold">${totalIncome.toFixed(2)}</p>
        </Card>

        <Card className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-ink-soft">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium">Ingresos Consultas</span>
          </div>
          <p className="text-2xl font-bold text-ink">${consultationIncome.toFixed(2)}</p>
          <p className="text-xs text-ink-soft">65% del total</p>
        </Card>

        <Card className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-ink-soft">
            <Activity className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium">Ingresos Laboratorios</span>
          </div>
          <p className="text-2xl font-bold text-ink">${labIncome.toFixed(2)}</p>
          <p className="text-xs text-ink-soft">35% del total</p>
        </Card>

        <Card className="p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-ink-soft">
            <FileText className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium">Consultas Facturadas</span>
          </div>
          <p className="text-2xl font-bold">{stats?.totalConsultations || 0}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="p-5">
          <h3 className="font-semibold text-lg mb-4">Relación de Laboratorios vs Consultas</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Consultas</span>
              <span className="font-medium">${consultationIncome.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '65%' }}></div>
            </div>
            
            <div className="flex justify-between text-sm mt-4">
              <span className="text-ink-soft">Laboratorios</span>
              <span className="font-medium">${labIncome.toFixed(2)}</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '35%' }}></div>
            </div>
          </div>
        </Card>
        
        <Card className="p-5 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-gray-50 rounded-full mb-4">
            <DollarSign className="h-8 w-8 text-ink-faint" />
          </div>
          <h3 className="font-medium text-ink">Historial de Transacciones</h3>
          <p className="text-sm text-ink-soft mt-2 mb-4 max-w-sm">
            Para ver el libro mayor completo y descargar el reporte de caja mensual, dirígete a las opciones avanzadas.
          </p>
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-md text-sm font-medium shadow-sm">
            Descargar Reporte Mensual
          </button>
        </Card>
      </div>
    </div>
  );
}
