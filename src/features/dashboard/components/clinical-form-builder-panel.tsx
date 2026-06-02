"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTenant } from "@/lib/supabase/tenant-context";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { GripVertical, Plus, Trash2, Check, Loader2, Save } from "lucide-react";

export type BlockType = 
  | "vital_signs"
  | "family_history"
  | "personal_history"
  | "habits"
  | "female_history"
  | "pediatric_history"
  | "review_of_systems"
  | "physical_exam"
  | "diagnosis"
  | "treatment_plan"
  | "medical_orders"
  | "paraclinicals";

type TemplateBlock = {
  id: string; // Must be unique for DnD
  type: BlockType;
  label: string;
};

type ClinicalFormTemplate = {
  id: string;
  name: string;
  schema: TemplateBlock[];
  is_active: boolean;
};

const AVAILABLE_BLOCKS: { type: BlockType; label: string; description: string }[] = [
  { type: "vital_signs", label: "Signos Vitales y Antropometría", description: "Presión arterial, FC, FR, Temperatura, Peso, Talla." },
  { type: "family_history", label: "Antecedentes Familiares", description: "Enfermedades hereditarias y contexto familiar." },
  { type: "personal_history", label: "Antecedentes Personales", description: "Patológicos, quirúrgicos, alergias, etc." },
  { type: "habits", label: "Hábitos Psicosociales", description: "Tabaco, alcohol, drogas, estilo de vida." },
  { type: "female_history", label: "Antecedentes Gineco-obstétricos", description: "Menarquia, FUM, gestaciones, partos, etc." },
  { type: "pediatric_history", label: "Antecedentes Pediátricos", description: "Perinatales, vacunas, desarrollo psicomotor." },
  { type: "review_of_systems", label: "Revisión por Sistemas", description: "Interrogatorio sistemático de órganos." },
  { type: "physical_exam", label: "Examen Físico Regional", description: "Cabeza, cuello, tórax, abdomen, extremidades." },
  { type: "diagnosis", label: "Diagnósticos (CIE-11)", description: "Búsqueda y asignación de códigos CIE-11." },
  { type: "treatment_plan", label: "Plan y Tratamiento (Receta)", description: "Prescripción de medicamentos." },
  { type: "medical_orders", label: "Órdenes Médicas / Cuidados", description: "Dieta, indicaciones generales." },
  { type: "paraclinicals", label: "Órdenes de Laboratorio e Imagen", description: "Solicitudes de paraclínicos." },
];

export function ClinicalFormBuilderPanel() {
  const { tenant } = useTenant();
  const [templates, setTemplates] = useState<ClinicalFormTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!tenant) return;
    loadTemplates();
  }, [tenant]);

  async function loadTemplates() {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("clinical_form_templates")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setTemplates(data as unknown as ClinicalFormTemplate[]);
        setActiveTemplateId(data[0].id);
      } else {
        // Create a default template if none exist
        const defaultBlocks: TemplateBlock[] = AVAILABLE_BLOCKS.map((b, i) => ({
          id: `block-${b.type}-${Date.now()}-${i}`,
          type: b.type,
          label: b.label,
        }));
        
        const { data: newTemplate, error: insertError } = await supabase
          .from("clinical_form_templates")
          .insert({
            clinic_id: tenant!.clinic_id,
            doctor_id: tenant!.doctor_id,
            name: "Plantilla General",
            schema: defaultBlocks,
            is_active: true,
          })
          .select()
          .single();
          
        if (insertError) throw insertError;
        if (newTemplate) {
          setTemplates([newTemplate as unknown as ClinicalFormTemplate]);
          setActiveTemplateId(newTemplate.id);
        }
      }
    } catch (err) {
      console.error("Error loading templates", err);
    } finally {
      setLoading(false);
    }
  }

  const activeTemplate = templates.find(t => t.id === activeTemplateId);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !activeTemplate) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newSchema = Array.from(activeTemplate.schema);
    const [reorderedItem] = newSchema.splice(sourceIndex, 1);
    newSchema.splice(destinationIndex, 0, reorderedItem);

    setTemplates(current =>
      current.map(t =>
        t.id === activeTemplate.id ? { ...t, schema: newSchema } : t
      )
    );
  };

  const addBlock = (blockType: BlockType) => {
    if (!activeTemplate) return;
    
    // Prevent duplicates for now to keep it simple, or allow? Let's allow but normally you don't need 2 physical exams.
    const blockDef = AVAILABLE_BLOCKS.find(b => b.type === blockType);
    if (!blockDef) return;

    const newBlock: TemplateBlock = {
      id: `block-${blockType}-${Date.now()}`,
      type: blockType,
      label: blockDef.label,
    };

    setTemplates(current =>
      current.map(t =>
        t.id === activeTemplate.id ? { ...t, schema: [...t.schema, newBlock] } : t
      )
    );
  };

  const removeBlock = (blockId: string) => {
    if (!activeTemplate) return;
    setTemplates(current =>
      current.map(t =>
        t.id === activeTemplate.id ? { ...t, schema: t.schema.filter(b => b.id !== blockId) } : t
      )
    );
  };

  const saveTemplate = async () => {
    if (!activeTemplate) return;
    setSaving(true);
    setMessage(null);
    try {
      const supabase = getSupabaseClient();
       
      const schemaJson = activeTemplate.schema as any;
      const { error } = await supabase
        .from("clinical_form_templates")
        .update({
          name: activeTemplate.name,
          schema: schemaJson,
        })
        .eq("id", activeTemplate.id);

      if (error) throw error;
      
      setMessage({ type: "success", text: "Plantilla guardada exitosamente. Se aplicará en tus próximas consultas." });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Error al guardar la plantilla." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>;
  }

  if (!activeTemplate) {
    return <div className="p-4 text-red-600">Error: No se pudo cargar la plantilla.</div>;
  }

  // Blocks that are not currently in the schema
  const unusedBlocks = AVAILABLE_BLOCKS.filter(
    ab => !activeTemplate.schema.some(sb => sb.type === ab.type)
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      
      {/* Columna Izquierda: El Constructor (Drag & Drop) */}
      <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-bold text-ink">Estructura de la Consulta</h3>
          <button 
            onClick={saveTemplate} 
            disabled={saving}
            className="hce-btn-primary h-9 px-4 text-sm flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Plantilla
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}>
            <Check className="w-4 h-4" />
            {message.text}
          </div>
        )}

        <div className="bg-bg-soft border border-border rounded-xl p-4 min-h-[400px]">
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="template-blocks">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-3"
                >
                  {activeTemplate.schema.map((block, index) => (
                    <Draggable key={block.id} draggableId={block.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-shadow ${
                            snapshot.isDragging ? "bg-white border-accent shadow-lg ring-1 ring-accent" : "bg-card border-border shadow-sm hover:border-accent/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="text-ink-soft hover:text-ink cursor-grab active:cursor-grabbing p-1"
                            >
                              <GripVertical className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-ink text-sm">{block.label}</span>
                          </div>
                          
                          <button
                            onClick={() => removeBlock(block.id)}
                            className="p-1.5 text-ink-soft hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Quitar módulo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  
                  {activeTemplate.schema.length === 0 && (
                    <div className="text-center py-12 text-ink-soft border-2 border-dashed border-border rounded-xl">
                      Arrastra módulos aquí o agrégalos desde el panel.
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>

        {/* Botón de Guardar Inferior para UX consistente con otras pestañas */}
        <div className="flex justify-end mt-2">
          <button 
            onClick={saveTemplate} 
            disabled={saving}
            className="hce-btn-primary h-11 px-6 text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Plantilla
          </button>
        </div>
      </div>

      {/* Columna Derecha: Módulos Disponibles */}
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="sticky top-24 border border-border bg-card rounded-xl shadow-sm p-4">
          <h3 className="font-bold text-ink mb-1">Módulos Disponibles</h3>
          <p className="text-xs text-ink-soft mb-4">Haz clic para agregarlos a tu plantilla.</p>
          
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {unusedBlocks.length === 0 ? (
              <p className="text-sm text-ink-soft py-4 text-center">Todos los módulos están en uso.</p>
            ) : (
              unusedBlocks.map((block) => (
                <button
                  key={block.type}
                  onClick={() => addBlock(block.type)}
                  className="w-full text-left flex flex-col gap-1 p-3 rounded-lg border border-border bg-bg-soft hover:border-accent hover:bg-accent/5 transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink group-hover:text-accent transition-colors">{block.label}</span>
                    <Plus className="w-4 h-4 text-ink-soft group-hover:text-accent transition-colors" />
                  </div>
                  <span className="text-xs text-ink-soft leading-tight">{block.description}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
