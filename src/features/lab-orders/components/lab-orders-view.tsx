import React, { useState } from "react";
import { useLabOrders, useUpdateLabOrder, useCreateLabOrder } from "../lib/use-lab-orders";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Beaker, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface LabOrdersViewProps {
  clinicId: string;
  userId: string;
}

export function LabOrdersView({ clinicId, userId }: LabOrdersViewProps) {
  const { data: orders, isLoading, error } = useLabOrders(clinicId);
  const updateOrder = useUpdateLabOrder();
  const createOrder = useCreateLabOrder();
  const [searchTerm, setSearchTerm] = useState("");
  const [showWalkinForm, setShowWalkinForm] = useState(false);
  const [walkinData, setWalkinData] = useState({ name: "", ci: "", phone: "", exams: "" });
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");

  const handleSaveResult = async (id: string) => {
    if (!resultText.trim()) return;
    await updateOrder.mutateAsync({
      id,
      updates: {
        results: { text: resultText, updated_at: new Date().toISOString() },
        status: "completed",
        completed_at: new Date().toISOString()
      }
    });
    setEditingResultId(null);
    setResultText("");
  };

  const handleCreateWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinData.name || !walkinData.ci || !walkinData.exams) return;
    
    try {
      const supabase = getSupabaseClient();
      
      // 1. Create Patient
      const { data: patient, error: patientError } = await (supabase as any)
        .from("patients")
        .insert({
          clinic_id: clinicId,
          full_name: walkinData.name,
          document_number: walkinData.ci,
          phone: walkinData.phone,
          status: "active",
          email: `${walkinData.ci}@walkin.local`
        })
        .select()
        .single();
        
      if (patientError) throw patientError;
      
      // 2. Create Order
      const examsList = walkinData.exams.split(",").map(x => x.trim()).filter(x => x);
      await createOrder.mutateAsync({
        clinic_id: clinicId,
        doctor_id: userId,
        patient_id: patient.id,
        order_type: "laboratory",
        items: examsList.map(e => ({ name: e, code: "", notes: "" })),
        reason: "Paciente Externo (Walk-in)",
        status: "pending"
      });
      
      setShowWalkinForm(false);
      setWalkinData({ name: "", ci: "", phone: "", exams: "" });
    } catch (err) {
      console.error(err);
      alert("Hubo un error al crear la orden. Inténtalo de nuevo.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">Error al cargar las órdenes</p>
        <p className="text-sm">{(error as Error).message}</p>
      </div>
    );
  }

  const filteredOrders = orders?.filter((order) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      order.patients?.full_name.toLowerCase().includes(term) ||
      order.patients?.document_number.toLowerCase().includes(term) ||
      order.profiles?.full_name.toLowerCase().includes(term)
    );
  }) ?? [];

  const handleStatusChange = (id: string, newStatus: "pending" | "in_progress" | "completed" | "cancelled") => {
    updateOrder.mutate({ 
      id, 
      updates: { 
        status: newStatus,
        completed_at: newStatus === "completed" ? new Date().toISOString() : null
      } 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800"><Clock className="mr-1 h-3 w-3" /> Pendiente</span>;
      case "in_progress":
        return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"><Loader2 className="mr-1 h-3 w-3 animate-spin" /> En proceso</span>;
      case "completed":
        return <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800"><CheckCircle className="mr-1 h-3 w-3" /> Completado</span>;
      case "cancelled":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"><XCircle className="mr-1 h-3 w-3" /> Cancelado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-ink">Laboratorio e Imagenología</h2>
          <p className="text-sm text-ink-soft">Gestiona las órdenes médicas enviadas por los doctores.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-lighter" />
            <Input 
              placeholder="Buscar por cédula o paciente..." 
              className="pl-9 bg-white w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowWalkinForm(!showWalkinForm)} variant={showWalkinForm ? "secondary" : "default"}>
            {showWalkinForm ? "Cancelar" : "Orden Rápida"}
          </Button>
        </div>
      </div>

      {showWalkinForm && (
        <Card className="p-6 border-accent/20 bg-accent/5 animate-in fade-in slide-in-from-top-2">
          <form onSubmit={handleCreateWalkin} className="space-y-4">
            <h3 className="font-semibold text-lg">Nueva Orden Rápida (Walk-in)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Nombre del Paciente</label>
                <Input required value={walkinData.name} onChange={e => setWalkinData({...walkinData, name: e.target.value})} placeholder="Ej. Juan Pérez" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Cédula</label>
                <Input required value={walkinData.ci} onChange={e => setWalkinData({...walkinData, ci: e.target.value})} placeholder="Nro de Identidad" className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Teléfono (Opcional)</label>
                <Input value={walkinData.phone} onChange={e => setWalkinData({...walkinData, phone: e.target.value})} placeholder="+593..." className="bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Exámenes (separados por coma)</label>
                <Input required value={walkinData.exams} onChange={e => setWalkinData({...walkinData, exams: e.target.value})} placeholder="Hemograma, Glucosa..." className="bg-white" />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Procesando..." : "Registrar y Crear Orden"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center bg-white/50">
            <Beaker className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-ink">No se encontraron órdenes</h3>
            <p className="text-sm text-ink-soft mt-1">Prueba con otro término de búsqueda o asegúrate de que se hayan generado órdenes desde la consulta.</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="flex-1 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {order.order_type === "laboratory" ? (
                        <Beaker className="h-5 w-5 text-accent" />
                      ) : (
                        <FileText className="h-5 w-5 text-accent" />
                      )}
                      <h3 className="font-semibold text-lg">
                        {order.order_type === "laboratory" ? "Laboratorio" : "Imagenología"}
                      </h3>
                      {getStatusBadge(order.status)}
                    </div>
                    <span className="text-sm text-ink-lighter">
                      {format(new Date(order.created_at), "dd MMM yyyy, h:mm a", { locale: es })}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <p className="text-ink-lighter font-medium">Paciente</p>
                      <p className="font-semibold">{order.patients?.full_name}</p>
                      <p className="text-xs text-ink-soft">CI: {order.patients?.document_number}</p>
                    </div>
                    <div>
                      <p className="text-ink-lighter font-medium">Médico Solicitante</p>
                      <p>{order.profiles?.full_name}</p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-ink-lighter font-medium text-sm mb-1">Exámenes solicitados:</p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      {order.items.map((item, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{item.name}</span>
                          {item.notes && <span className="text-ink-soft"> - {item.notes}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {order.reason && (
                    <div className="bg-gray-50 p-3 rounded-md border border-gray-100 text-sm">
                      <p className="text-ink-lighter font-medium mb-1">Motivo:</p>
                      <p>{order.reason}</p>
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 p-6 md:w-64 border-t md:border-t-0 md:border-l flex flex-col justify-center gap-3">
                  <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Acciones</p>
                  
                  {order.status === "pending" && (
                    <Button 
                      onClick={() => handleStatusChange(order.id, "in_progress")}
                      className="w-full"
                    >
                      Tomar muestra
                    </Button>
                  )}
                  
                  {order.status === "in_progress" && editingResultId !== order.id && (
                    <Button 
                      onClick={() => {
                        setEditingResultId(order.id);
                        setResultText(order.results ? (order.results as any).text || "" : "");
                      }}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      Ingresar Resultados
                    </Button>
                  )}

                  {order.status === "completed" && editingResultId !== order.id && (
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setEditingResultId(order.id);
                        setResultText(order.results ? (order.results as any).text || "" : "");
                      }}
                      className="w-full text-xs"
                    >
                      Editar Resultados
                    </Button>
                  )}

                  {(order.status === "pending" || order.status === "in_progress") && (
                    <Button 
                      variant="ghost" 
                      onClick={() => handleStatusChange(order.id, "cancelled")}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Cancelar
                    </Button>
                  )}
                  
                  {order.status === "completed" && editingResultId !== order.id && (
                    <>
                      <div className="text-center text-sm text-green-700 flex flex-col items-center mt-2">
                        <CheckCircle className="h-6 w-6 mb-1" />
                        <span>Completado</span>
                      </div>
                      
                      {order.patients?.phone && (
                        <Button 
                          variant="outline"
                          className="w-full text-xs mt-3 flex items-center justify-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
                          onClick={async () => {
                            if (!confirm("¿Enviar resultados por WhatsApp al paciente?")) return;
                            try {
                              if (!order.patients) throw new Error("Sin datos de paciente");
                              const res = await fetch("/api/whatsapp/pdf", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  phone: order.patients.phone,
                                  patientName: order.patients.full_name,
                                  pdfUrl: `${window.location.origin}/api/pdf/lab/${order.id}`,
                                  filename: `Resultados_${order.patients.full_name.replace(/\s/g, "_")}.pdf`
                                })
                              });
                              if (!res.ok) throw new Error("Fallo envío");
                              alert("Enviado correctamente por WhatsApp");
                            } catch (e) {
                              alert("Error al enviar el mensaje por WhatsApp. Asegúrate de que las credenciales estén configuradas.");
                            }
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          Enviar al paciente
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {editingResultId === order.id && (
                <div className="bg-white border-t p-6 animate-in slide-in-from-top-2">
                  <h4 className="text-sm font-semibold mb-2">Ingresar Resultados de Laboratorio</h4>
                  <textarea 
                    className="w-full h-32 p-3 text-sm border rounded-md focus:ring-2 focus:ring-accent focus:outline-none"
                    placeholder="Escribe aquí los resultados del paciente..."
                    value={resultText}
                    onChange={(e) => setResultText(e.target.value)}
                  />
                  <div className="flex justify-end gap-2 mt-3">
                    <Button variant="ghost" onClick={() => setEditingResultId(null)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => handleSaveResult(order.id)}
                      disabled={updateOrder.isPending}
                    >
                      {updateOrder.isPending ? "Guardando..." : "Guardar y Finalizar"}
                    </Button>
                  </div>
                </div>
              )}
              
              {order.status === "completed" && order.results && editingResultId !== order.id && (
                <div className="bg-gray-50 border-t p-6">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-accent" />
                    Reporte de Resultados
                  </h4>
                  <div className="bg-white p-4 border rounded-md text-sm text-ink whitespace-pre-wrap">
                    {(order.results as any).text}
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
