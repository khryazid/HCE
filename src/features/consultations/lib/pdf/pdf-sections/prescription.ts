import type { PdfContext } from "../pdf-types";
import { setColor, drawSectionHeader, checkPageBreak } from "../pdf-helpers";
import { PDF_COLORS } from "../pdf-constants";
import { drawPageHeader, drawSignatureLine } from "./header-footer";

export function drawPrescriptionPage(ctx: PdfContext) {
  const { doc, data, margin, pageWidth, contentWidth, pageHeight } = ctx;

  doc.addPage();
  ctx.y = margin;

  drawPageHeader(ctx);

  // Patient mini-header for page 2
  setColor(doc, PDF_COLORS.DARK_BLUE);
  doc.setFont("helvetica", "bold");
  doc.text(`Paciente: ${data.patientName}`, margin, ctx.y);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${data.consultationDate.split(",")[0]}`, pageWidth - margin - doc.getTextWidth(`Fecha: ${data.consultationDate.split(",")[0]}`), ctx.y);
  ctx.y += 20;

  drawSectionHeader(ctx, "PRESCRIPCIÓN MÉDICA");

  doc.setFont("helvetica", "normal");
  setColor(doc, PDF_COLORS.TEXT);
  const tpLines = doc.splitTextToSize(data.treatmentPlan, contentWidth - 10);
  for (const line of tpLines) {
    checkPageBreak(ctx, 15);
    const printLine = line.trim().startsWith("-") || line.trim().startsWith("•") ? line : `• ${line}`;
    doc.text(printLine, margin + 5, ctx.y);
    ctx.y += 14;
  }
  ctx.y += 20;

  // Nota al pie
  const footerY = pageHeight - margin - 80; // Allow more space for signature block
  if (ctx.y < footerY) ctx.y = footerY;
  
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.line(margin, ctx.y - 10, pageWidth - margin, ctx.y - 10);
  
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  setColor(doc, PDF_COLORS.LIGHT_TEXT);
  doc.text("Válido solo con firma y sello del médico. Documento confidencial — uso exclusivo para dispensación farmacéutica.", margin, ctx.y);
  ctx.y += 20;

  drawSignatureLine(ctx);
}
