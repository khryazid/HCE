import React, { useState } from "react";
import { useLabOrders, useUpdateLabOrder, useCreateLabOrder } from "../lib/use-lab-orders";
import { useClinicMembers } from "@/features/clinic-admin/lib/use-clinic-admin";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Beaker, FileText, CheckCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { usePatients } from "@/features/patients/lib/use-patients-queries";
import { useLabExams } from "../lib/use-lab-exams";
import { useClinicSettings } from "../lib/use-clinic-settings";
import { useTenant } from "@/lib/supabase/tenant-context";

interface LabOrdersViewProps {
  clinicId: string;
  userId: string;
  memberId?: string;
}

export function LabOrdersView({ clinicId, userId, memberId }: LabOrdersViewProps) {
  const { tenant } = useTenant();
  const isLab = tenant?.role === "lab" || tenant?.role === "clinic_admin" || tenant?.role === "owner";
  const { data: members } = useClinicMembers(clinicId);
  const { data: orders, isLoading, error } = useLabOrders(clinicId);
  const updateOrder = useUpdateLabOrder();
  const createOrder = useCreateLabOrder();
  
  const { data: patientsList } = usePatients(tenant);
  const { data: examsCatalog } = useLabExams(clinicId);
  const { data: clinicSettings } = useClinicSettings(clinicId);

  const [searchTerm, setSearchTerm] = useState("");
  const [showWalkinForm, setShowWalkinForm] = useState(false);
  const [walkinData, setWalkinData] = useState({ 
    patientId: "", 
    category: "Laboratorio Clínico", 
    examIds: [] as string[],
    amount: "" 
  });
  const [editingResultId, setEditingResultId] = useState<string | null>(null);
  const [resultText, setResultText] = useState("");

  const handleSaveResult = async (id: string) => {
    if (!resultText.trim()) return;
    const technician = members?.find(m => m.doctor_id === userId);
    const techName = technician?.doctor_profile?.full_name || "Técnico de Laboratorio";

    await updateOrder.mutateAsync({
      id,
      updates: {
        results: { 
          text: resultText, 
          technician_name: techName,
          updated_at: new Date().toISOString() 
        },
        status: "completed",
        completed_at: new Date().toISOString()
      }
    });
    setEditingResultId(null);
    setResultText("");
  };

  const generatePDF = async (order: any) => {
    const doc = new jsPDF();
    const docWidth = doc.internal.pageSize.getWidth();
    
    // Header Letterhead
    if (clinicSettings?.lab_letterhead_url) {
      try {
        const img = new Image();
        img.src = clinicSettings.lab_letterhead_url;
        img.crossOrigin = "Anonymous";
        await new Promise((resolve) => {
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
        });
        doc.addImage(img, "PNG", 14, 10, docWidth - 28, 30);
      } catch (e) {
        console.warn("Could not load letterhead", e);
      }
    } else {
      doc.setFontSize(20);
      doc.setTextColor(15, 118, 110); // Teal 600
      doc.text("Reporte de Resultados", docWidth / 2, 20, { align: "center" });
    }
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, docWidth / 2, 45, { align: "center" });
    
    doc.setDrawColor(200);
    doc.line(14, 50, docWidth - 14, 50);
    
    // Patient Info
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Información del Paciente", 14, 60);
    
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Paciente: ${order.patients?.full_name || "Desconocido"}`, 14, 68);
    doc.text(`Documento: ${order.patients?.document_number || "N/A"}`, 14, 75);
    
    const doctor = members?.find((m: any) => m.doctor_id === order.doctor_id);
    const doctorName = doctor?.doctor_profile?.full_name || "Doctor Desconocido";
    doc.text(`Médico Solicitante: ${doctorName}`, 14, 82);
    
    doc.line(14, 90, docWidth - 14, 90);
    
    // Exams List
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Exámenes Realizados", 14, 100);
    
    const itemsData = order.items.map((item: any) => [item.name, item.notes || "-"]);
    (doc as any).autoTable({
      startY: 105,
      head: [["Examen", "Categoría/Notas"]],
      body: itemsData,
      theme: "striped",
      headStyles: { fillColor: [15, 118, 110] },
      styles: { fontSize: 9 }
    });
    
    // Results
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Resultados Médicos", 14, finalY + 15);
    
    doc.setFontSize(10);
    doc.setTextColor(50);
    const splitText = doc.splitTextToSize(order.results?.text || "Sin resultados detallados.", docWidth - 28);
    doc.text(splitText, 14, finalY + 25);
    
    // Footer / Signature
    const techName = order.results?.technician_name || "Técnico de Laboratorio";
    const signatureY = doc.internal.pageSize.getHeight() - 40;
    doc.setDrawColor(150);
    doc.line(docWidth / 2 - 30, signatureY, docWidth / 2 + 30, signatureY);
    doc.text(techName, docWidth / 2, signatureY + 6, { align: "center" });
    doc.text("Procesado por", docWidth / 2, signatureY + 12, { align: "center" });

    if (clinicSettings?.lab_footer_text) {
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(clinicSettings.lab_footer_text, docWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: "center" });
    }
    
    doc.save(`Resultados_${order.patients?.full_name?.replace(/\s/g, "_") || "Paciente"}.pdf`);
  };

  const handleCreateWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinData.patientId || walkinData.examIds.length === 0) return;
    
    try {
      const supabase = getSupabaseClient();
      const patient = patientsList?.find(p => p.id === walkinData.patientId);
      if (!patient) throw new Error("Paciente no encontrado");

      const selectedExams = examsCatalog?.filter(ex => walkinData.examIds.includes(ex.id)) || [];
      
      // 1. Create Order in legacy table
      await createOrder.mutateAsync({
        clinic_id: clinicId,
        doctor_id: userId,
        patient_id: patient.id,
        order_type: walkinData.category === "Imagenología" ? "imaging" : "laboratory",
        items: selectedExams.map(e => ({ name: e.name, code: e.id, notes: walkinData.category })),
        reason: "Paciente Externo (Walk-in)",
        status: "pending"
      });

      // 2b. Dual-write to department_orders (new unified table)
      if (memberId) {
        try {
          await (supabase as any).from("department_orders").insert({
            organization_id: clinicId,
            department_type: "lab",
            patient_id: patient.id,
            ordered_by_member_id: memberId,
            title: selectedExams.map(e => e.name).join(", "),
            notes: "Paciente Externo (Walk-in)",
            status: "pending"
          });
        } catch (e) {
          console.warn("Dual-write department_orders falló (non-critical):", e);
        }
      }
      
      // 3. Create Cash Transaction for the lab order
      if (walkinData.amount && !isNaN(Number(walkinData.amount))) {
        try {
          await (supabase as any).from("cash_transactions").insert({
            clinic_id: clinicId,
            user_id: userId,
            patient_id: patient.id,
            type: "income",
            amount: Number(walkinData.amount),
            concept: `${walkinData.category} - Varios Exámenes`,
            payment_method: "cash",
            status: "completed"
          });
        } catch (e) {
          console.warn("Dual-write cash_transactions falló:", e);
        }
      }

      setShowWalkinForm(false);
      setWalkinData({ patientId: "", category: "Laboratorio Clínico", examIds: [], amount: "" });
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
    const doctor = members?.find(m => m.doctor_id === order.doctor_id);
    const doctorName = doctor?.doctor_profile?.full_name || "Doctor Desconocido";
    
    return (
      order.patients?.full_name.toLowerCase().includes(term) ||
      order.patients?.document_number.toLowerCase().includes(term) ||
      doctorName.toLowerCase().includes(term)
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
              className="pl-9 bg-transparent w-full"
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
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Seleccionar Paciente</label>
                <select 
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background"
                  value={walkinData.patientId} 
                  onChange={e => setWalkinData({...walkinData, patientId: e.target.value})}
                >
                  <option value="">Seleccione un paciente de su historial...</option>
                  {patientsList?.map(p => (
                    <option key={p.id} value={p.id}>{p.full_name} ({p.document_number || "Sin ID"})</option>
                  ))}
                </select>
                <p className="text-[10px] text-ink-soft">Si es nuevo, regístralo en la pestaña &quot;Pacientes&quot; primero.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Categoría</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={walkinData.category} 
                  onChange={e => setWalkinData({...walkinData, category: e.target.value})}
                >
                  <option value="Laboratorio Clínico">Laboratorio Clínico</option>
                  <option value="Imagenología">Imagenología</option>
                  <option value="Genética">Genética</option>
                  <option value="Patología">Patología</option>
                </select>
              </div>
              <div className="space-y-2 lg:col-span-3">
                <label className="text-xs font-semibold uppercase text-ink-soft">Exámenes del Catálogo</label>
                <div className="border border-input rounded-md min-h-[80px] max-h-32 overflow-y-auto p-2 bg-transparent grid grid-cols-2 md:grid-cols-3 gap-2">
                  {(!examsCatalog || examsCatalog.filter(ex => ex.category === walkinData.category).length === 0) && (
                    <p className="text-xs text-ink-soft col-span-full p-2">No hay exámenes en esta categoría. Agrégalos en &quot;Ajustes&quot;.</p>
                  )}
                  {examsCatalog?.filter(ex => ex.category === walkinData.category).map(exam => (
                    <label key={exam.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={walkinData.examIds.includes(exam.id)}
                        onChange={(e) => {
                          const isChecked = e.target.checked;
                          setWalkinData(prev => ({
                            ...prev,
                            examIds: isChecked 
                              ? [...prev.examIds, exam.id]
                              : prev.examIds.filter(id => id !== exam.id)
                          }));
                        }}
                      />
                      <span className="truncate">{exam.name} <span className="text-ink-soft text-xs">(${exam.default_price})</span></span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-ink-soft">Monto a Cobrar ($)</label>
                <Input 
                  type="number" step="0.01" min="0" 
                  value={walkinData.amount} 
                  onChange={e => setWalkinData({...walkinData, amount: e.target.value})} 
                  placeholder="Se calculará aut..." 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="w-full text-xs h-7"
                  onClick={() => {
                    const total = walkinData.examIds.reduce((sum, id) => {
                      const ex = examsCatalog?.find(e => e.id === id);
                      return sum + (ex?.default_price || 0);
                    }, 0);
                    setWalkinData(prev => ({ ...prev, amount: total.toString() }));
                  }}
                >
                  Sumar Catálogo
                </Button>
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
          <div className="rounded-xl border border-dashed border-accent/30 p-8 text-center bg-accent/5">
            <Beaker className="mx-auto h-12 w-12 text-accent/50" />
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
                      <p>{members?.find(m => m.doctor_id === order.doctor_id)?.doctor_profile?.full_name || "Doctor Desconocido"}</p>
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
                      
                      <Button 
                        variant="outline"
                        className="w-full text-xs mt-3 flex items-center justify-center gap-2 border-teal-200 text-teal-700 hover:bg-teal-50"
                        onClick={() => generatePDF(order)}
                      >
                        <FileText className="w-4 h-4" />
                        Descargar PDF
                      </Button>

                      {(order.patients as any)?.phone && (
                        <Button 
                          variant="outline"
                          className="w-full text-xs mt-3 flex items-center justify-center gap-2 border-green-200 text-green-700 hover:bg-green-50"
                          onClick={() => {
                            const phone = (order.patients as any).phone;
                            const message = `Hola ${order.patients?.full_name}, tus resultados médicos de Laboratorio e Imagenología ya están listos. Puedes acercarte a la clínica a retirarlos o solicitar que te los enviemos por este medio. ¡Saludos!`;
                            const waUrl = `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
                            window.open(waUrl, "_blank");
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          Notificar por WhatsApp
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
                  <h4 className="text-sm font-semibold mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-accent" />
                      Reporte de Resultados
                    </span>
                    {order.results?.technician_name && (
                      <span className="text-xs font-normal text-ink-soft">
                        Procesado por: {order.results.technician_name}
                      </span>
                    )}
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
