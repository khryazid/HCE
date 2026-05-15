import type { ConsultationPdfData, PdfContext } from "./pdf-types";
import type { LetterheadSettings } from "@/features/dashboard/lib/letterhead";
import { drawPageHeader } from "./pdf-sections/header-footer";
import { drawSummaryPage } from "./pdf-sections/summary";
import { drawPrescriptionPage } from "./pdf-sections/prescription";
import { drawInstructionsPage } from "./pdf-sections/instructions";
import { drawOrdersPage } from "./pdf-sections/orders";

export async function generateConsultationPdf(
  letterhead: LetterheadSettings,
  data: ConsultationPdfData,
  output: "download" | "blob" = "download"
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

  // --- PAGE 1: RESUMEN DE CONSULTA ---
  drawPageHeader(ctx);
  drawSummaryPage(ctx);

  // --- PAGE 2: RECETA ---
  drawPrescriptionPage(ctx);

  // --- PAGE 3: HOJA DEL PACIENTE ---
  drawInstructionsPage(ctx);

  // --- PAGE 4: ORDENES PARACLINICAS ---
  drawOrdersPage(ctx);

  if (output === "blob") {
    const arrayBuffer = doc.output("arraybuffer");
    return new Uint8Array(arrayBuffer);
  }

  // Sanitizar el nombre del paciente para nombre de archivo seguro
  const safeName = data.patientName.replace(/[^a-zA-Z0-9]/g, "-").replace(/-+/g, "-");
  doc.save(`${safeName}-${data.patientDocument}.pdf`);
}
