"use client";

import { useState } from "react";
import { useTenant } from "@/lib/supabase/tenant-context";
import { useDepartmentOrders, useDepartmentOrderStats, useUpdateDepartmentOrder } from "@/features/department-orders/lib/use-department-orders";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { Card } from "@/components/ui/card";
import {
  Scissors,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  PlayCircle,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Surgery department dashboard — /cirugia
 *
 * Shows department_orders where department_type='surgery'.
 * - Pending surgery requests from doctors
 * - Budget management (solicitudes / presupuestos)
 * - Status flow: pending → in_progress → done
 */
export default function SurgeryClient() {
  const { tenant, loading, error, session } = useTenant();
  const [activeTab, setActiveTab] = useState<"solicitudes" | "completados">("solicitudes");
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");

  const { data: orders, isLoading: ordersLoading } = useDepartmentOrders(
    tenant?.clinic_id ?? "",
    "surgery"
  );
  const stats = useDepartmentOrderStats(tenant?.clinic_id ?? "", "surgery");
  const updateOrder = useUpdateDepartmentOrder();

  if (loading) return <DashboardSkeleton />;

  if (error || !tenant || !session) {
    return (
      <div className="rounded-md bg-red-50 p-4 mt-4 text-sm font-medium text-red-800">
        No se pudo cargar el contexto.
      </div>
    );
  }

  const filteredOrders = orders?.filter((order) => {
    if (activeTab === "solicitudes") return order.status !== "done";
    return order.status === "done";
  }) ?? [];

  const handleStatusChange = (id: string, newStatus: "pending" | "in_progress" | "done") => {
    updateOrder.mutate({
      id,
      updates: {
        status: newStatus,
        completed_at: newStatus === "done" ? new Date().toISOString() : null,
      },
    });
  };

  const handleSaveResult = async (id: string) => {
    if (!resultText.trim()) return;
    await updateOrder.mutateAsync({
      id,
      updates: {
        result_notes: resultText,
        status: "done",
        completed_at: new Date().toISOString(),
      },
    });
    setEditingResultId(null);
    setResultText("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"><Clock className="mr-1 h-3 w-3" /> Pendiente</span>;
      case "in_progress":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"><PlayCircle className="mr-1 h-3 w-3" /> En proceso</span>;
      case "done":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"><CheckCircle className="mr-1 h-3 w-3" /> Completado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Scissors className="h-6 w-6 text-accent" />
            Área Quirúrgica
          </h2>
          <p className="text-sm text-ink-soft mt-1">Gestión de solicitudes quirúrgicas y presupuestos.</p>
        </div>
        {(tenant.role === "doctor" || tenant.role === "owner") && (
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Solicitud Quirúrgica
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === "solicitudes" ? "text-accent" : "text-ink-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("solicitudes")}
        >
          Solicitudes ({stats.pending + stats.inProgress})
          {activeTab === "solicitudes" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
          )}
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${
            activeTab === "completados" ? "text-accent" : "text-ink-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("completados")}
        >
          Completados ({stats.done})
          {activeTab === "completados" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          {ordersLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card className="p-12 text-center border-dashed bg-bg-soft/30 flex flex-col items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-4">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-ink">
                {activeTab === "solicitudes" ? "No hay solicitudes pendientes" : "Sin cirugías completadas"}
              </h3>
              <p className="text-sm text-ink-soft max-w-sm mt-2">
                {activeTab === "solicitudes"
                  ? "Las solicitudes quirúrgicas referidas por los médicos aparecerán aquí."
                  : "Las cirugías completadas aparecerán en esta sección."}
              </p>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Scissors className="h-4 w-4 text-accent" />
                        <h3 className="font-semibold">{order.title || "Solicitud quirúrgica"}</h3>
                        {getStatusBadge(order.status)}
                      </div>
                      <span className="text-xs text-ink-soft">
                        {format(new Date(order.created_at), "dd MMM yyyy", { locale: es })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <p className="text-ink-soft text-xs font-medium">Paciente</p>
                        <p className="font-semibold">{order.patients?.full_name}</p>
                        <p className="text-xs text-ink-soft">CI: {order.patients?.document_number}</p>
                      </div>
                    </div>

                    {order.notes && (
                      <div className="bg-bg-soft/50 p-3 rounded-md text-sm">
                        <p className="text-xs text-ink-soft font-medium mb-1">Notas del médico:</p>
                        <p>{order.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="bg-bg-soft/30 p-5 md:w-56 border-t md:border-t-0 md:border-l flex flex-col justify-center gap-2">
                    <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Acciones</p>

                    {order.status === "pending" && (
                      <Button onClick={() => handleStatusChange(order.id, "in_progress")} className="w-full" size="sm">
                        Aceptar solicitud
                      </Button>
                    )}

                    {order.status === "in_progress" && editingResultId !== order.id && (
                      <Button
                        onClick={() => { setEditingResultId(order.id); setResultText(order.result_notes ?? ""); }}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        Marcar completado
                      </Button>
                    )}

                    {order.status === "done" && (
                      <div className="text-center text-sm text-green-700 flex flex-col items-center">
                        <CheckCircle className="h-6 w-6 mb-1" />
                        <span>Cirugía completada</span>
                        {order.completed_at && (
                          <span className="text-xs text-ink-soft mt-1">
                            {format(new Date(order.completed_at), "dd MMM yyyy", { locale: es })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Result editor */}
                {editingResultId === order.id && (
                  <div className="bg-white border-t p-5 animate-in slide-in-from-top-2">
                    <h4 className="text-sm font-semibold mb-2">Notas post-quirúrgicas</h4>
                    <textarea
                      className="w-full h-28 p-3 text-sm border rounded-md focus:ring-2 focus:ring-accent focus:outline-none"
                      placeholder="Describe los hallazgos y resultado de la cirugía..."
                      value={resultText}
                      onChange={(e) => setResultText(e.target.value)}
                    />
                    <div className="flex justify-end gap-2 mt-3">
                      <Button variant="ghost" size="sm" onClick={() => setEditingResultId(null)}>Cancelar</Button>
                      <Button size="sm" onClick={() => handleSaveResult(order.id)} disabled={updateOrder.isPending}>
                        {updateOrder.isPending ? "Guardando..." : "Completar cirugía"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Display result */}
                {order.status === "done" && order.result_notes && editingResultId !== order.id && (
                  <div className="bg-bg-soft/30 border-t p-5">
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent" />
                      Notas post-quirúrgicas
                    </h4>
                    <div className="bg-white p-3 border rounded-md text-sm whitespace-pre-wrap">{order.result_notes}</div>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-amber-500" />
              Pendientes
            </h3>
            <p className="text-3xl font-bold text-ink">{stats.pending}</p>
            <p className="text-xs text-ink-soft mt-1">Solicitudes por revisar</p>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <PlayCircle className="h-5 w-5 text-blue-500" />
              En proceso
            </h3>
            <p className="text-3xl font-bold text-ink">{stats.inProgress}</p>
            <p className="text-xs text-ink-soft mt-1">Cirugías programadas</p>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Completadas
            </h3>
            <p className="text-3xl font-bold text-ink">{stats.done}</p>
            <p className="text-xs text-ink-soft mt-1">Cirugías realizadas</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
