import type { ConsultationPdfData, PdfContext } from "./pdf-types";
import type { LetterheadSettings } from "@/features/dashboard/lib/letterhead";
import type { PdfSectionKey } from "./pdf-section-selector";
import { drawPageHeader } from "./pdf-sections/header-footer";
import { drawSummaryPage } from "./pdf-sections/summary";
import { drawPrescriptionPage } from "./pdf-sections/prescription";
import { drawInstructionsPage } from "./pdf-sections/instructions";
import { drawOrdersPage } from "./pdf-sections/orders";


export async function generateConsultationPdf(
  letterhead: LetterheadSettings,
  data: ConsultationPdfData,
  output: "download" | "blob" = "download",
  enabledSections?: Set<PdfSectionKey>,
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  

  
  const ctx: PdfContext = {
    doc,
    y: 40,
    margin: 40,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    contentWidth: doc.internal.pageSize.getWidth() - 80,
    letterhead,
    data,
  };

  // If no sections specified, render everything (backward compatible)
  const all = !enabledSections;
  const has = (key: PdfSectionKey) => all || enabledSections!.has(key);

  // --- PAGE 1: RESUMEN DE CONSULTA ---
  // The summary page covers: patient_info, chief_complaint, medical_history,
  // vital_signs, physical_exam, diagnosis
  const summaryKeys: PdfSectionKey[] = [
    "patient_info", "chief_complaint", "medical_history",
    "vital_signs", "physical_exam", "diagnosis",
  ];
  if (summaryKeys.some(has)) {
    drawPageHeader(ctx);
    drawSummaryPage(ctx);
  }

  // --- PAGE 2: RECETA ---
  if (has("prescription") || has("treatment_plan")) {
    drawPrescriptionPage(ctx);
  }

  // --- PAGE 3: HOJA DEL PACIENTE ---
  if (has("recommendations") || has("follow_up")) {
    drawInstructionsPage(ctx);
  }

  // --- PAGE 4: ORDENES PARACLINICAS ---
  if (has("lab_orders") || has("imaging_orders")) {
    drawOrdersPage(ctx);
  }

  if (output === "blob") {
    const arrayBuffer = doc.output("arraybuffer");
    return new Uint8Array(arrayBuffer);
  }

  // Sanitizar el nombre del paciente para nombre de archivo seguro
  const safeName = data.patientName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
  doc.save(`${safeName}-${data.patientDocument}.pdf`);
}

