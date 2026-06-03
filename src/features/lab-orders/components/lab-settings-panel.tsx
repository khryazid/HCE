"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLabExams, useCreateLabExam, useDeleteLabExam } from "../lib/use-lab-exams";
import { useClinicSettings, useUpdateClinicSettings } from "../lib/use-clinic-settings";
import { Loader2, Trash2, Plus, FlaskConical, FileText, ScanLine } from "lucide-react";
import { useTenant } from "@/lib/supabase/tenant-context";

export function LabSettingsPanel({ department = "lab" }: { department?: "lab" | "imaging" }) {
  const { tenant } = useTenant();
  const clinicId = tenant?.clinic_id || "";
  
  const { data: exams, isLoading: isLoadingExams } = useLabExams(clinicId);
  const createExam = useCreateLabExam();
  const deleteExam = useDeleteLabExam();
  
  const { data: settings, isLoading: isLoadingSettings } = useClinicSettings(clinicId);
  const updateSettings = useUpdateClinicSettings();

  const [newExamName, setNewExamName] = useState("");
  const [newExamCategory, setNewExamCategory] = useState(department === "imaging" ? "Imagenología" : "Laboratorio Clínico");
  const [newExamPrice, setNewExamPrice] = useState("");

  const filteredExams = exams?.filter(exam => 
    department === "imaging" ? exam.category === "Imagenología" : exam.category === "Laboratorio Clínico"
  );
  
  const [letterheadUrl, setLetterheadUrl] = useState(
    department === "imaging" 
      ? (settings?.imaging_letterhead_url || "") 
      : (settings?.lab_letterhead_url || "")
  );
  const [footerText, setFooterText] = useState(
    department === "imaging" 
      ? (settings?.imaging_footer_text || "") 
      : (settings?.lab_footer_text || "")
  );

  const handleAddExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamName || !clinicId) return;
    try {
      await createExam.mutateAsync({
        clinic_id: clinicId,
        name: newExamName,
        category: newExamCategory,
        default_price: Number(newExamPrice) || 0
      });
      setNewExamName("");
      setNewExamPrice("");
    } catch (e) {
      alert("Error al agregar examen.");
    }
  };

  const handleSaveSettings = async () => {
    if (!clinicId) return;
    try {
      const payload: any = { clinic_id: clinicId };
      
      // Preserve existing settings for the other department so they aren't overwritten with nulls
      if (settings) {
        payload.lab_letterhead_url = settings.lab_letterhead_url;
        payload.lab_footer_text = settings.lab_footer_text;
        payload.imaging_letterhead_url = settings.imaging_letterhead_url;
        payload.imaging_footer_text = settings.imaging_footer_text;
      }
      
      if (department === "imaging") {
        payload.imaging_letterhead_url = letterheadUrl;
        payload.imaging_footer_text = footerText;
      } else {
        payload.lab_letterhead_url = letterheadUrl;
        payload.lab_footer_text = footerText;
      }

      await updateSettings.mutateAsync(payload);
      alert("Configuración guardada correctamente.");
    } catch (e) {
      alert("Error al guardar la configuración.");
    }
  };

  if (isLoadingExams || isLoadingSettings) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Settings Panel */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent" />
          Membrete e Impresión PDF
        </h3>
        <p className="text-sm text-ink-soft mb-6">
          Configura la imagen de cabecera que aparecerá en los reportes de laboratorio. Coloca la URL de la imagen de tu logotipo o membrete (ej. subida en Imgur o tu propio servidor).
        </p>
        
        <div className="space-y-4 max-w-xl">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-ink-soft">URL del Membrete (Imagen Superior)</label>
            <Input 
              value={letterheadUrl} 
              onChange={e => setLetterheadUrl(e.target.value)} 
              placeholder="https://ejemplo.com/logo.png" 
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-ink-soft">Texto al pie de página (Opcional)</label>
            <Input 
              value={footerText} 
              onChange={e => setFooterText(e.target.value)} 
              placeholder="Av. Principal 123 - Tel: 555-1234" 
            />
          </div>
          <Button onClick={handleSaveSettings} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </div>
      </Card>

      {/* Catalog Panel */}
      <Card className="p-6">
        <h3 className="text-lg font-bold text-ink mb-4 flex items-center gap-2">
          {department === "imaging" ? <ScanLine className="w-5 h-5 text-accent" /> : <FlaskConical className="w-5 h-5 text-accent" />}
          Catálogo de {department === "imaging" ? "Estudios de Imagen" : "Exámenes"}
        </h3>
        <p className="text-sm text-ink-soft mb-6">
          Agrega {department === "imaging" ? "estudios" : "exámenes"} frecuentes a tu catálogo para seleccionarlos rápidamente al crear nuevas órdenes y cobrar automáticamente.
        </p>

        <form onSubmit={handleAddExam} className="flex flex-col md:flex-row gap-3 mb-6 bg-bg-soft p-4 rounded-lg">
          <select 
            className="flex h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background md:w-48 bg-bg-elevated cursor-not-allowed"
            value={newExamCategory} 
            onChange={e => setNewExamCategory(e.target.value)}
            disabled
          >
            {department === "imaging" ? (
              <option value="Imagenología">Imagenología</option>
            ) : (
              <option value="Laboratorio Clínico">Laboratorio Clínico</option>
            )}
          </select>
          <Input 
            className="flex-1" 
            required 
            value={newExamName} 
            onChange={e => setNewExamName(e.target.value)} 
            placeholder={department === "imaging" ? "Nombre del Estudio (ej. Rayos X de Tórax)" : "Nombre del Examen (ej. Hemograma Completo)"} 
          />
          <Input 
            type="number" 
            step="0.01" 
            min="0"
            className="w-full md:w-32" 
            value={newExamPrice} 
            onChange={e => setNewExamPrice(e.target.value)} 
            placeholder="Precio ($)" 
          />
          <Button type="submit" disabled={createExam.isPending}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar
          </Button>
        </form>

        <div className="border rounded-md divide-y divide-border">
          {filteredExams?.length === 0 ? (
            <p className="p-4 text-center text-sm text-ink-soft">Aún no hay registros guardados.</p>
          ) : (
            filteredExams?.map(exam => (
              <div key={exam.id} className="flex items-center justify-between p-3 hover:bg-bg-soft transition-colors">
                <div>
                  <p className="font-medium text-ink text-sm">{exam.name}</p>
                  <p className="text-xs text-ink-soft">{exam.category} • ${exam.default_price.toFixed(2)}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => deleteExam.mutate({ id: exam.id, clinicId })}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  disabled={deleteExam.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
