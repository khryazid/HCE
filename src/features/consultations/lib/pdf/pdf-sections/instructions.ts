import type { PdfContext } from "../pdf-types";
import { setColor, checkPageBreak } from "../pdf-helpers";
import { PDF_COLORS } from "../pdf-constants";
import { drawPageFooter } from "./header-footer";
import { resolveImageFormat } from "../pdf-helpers";

export function drawInstructionsPage(ctx: PdfContext) {
  const { doc, data, letterhead, margin, pageWidth, contentWidth, pageHeight } = ctx;

  if (!data.medicationInstructions && !data.recommendations && !data.warningSigns) {
    return;
  }

  doc.addPage();
  ctx.y = margin;

  // Header mini
  if (letterhead.logo_data_url) {
    try { doc.addImage(letterhead.logo_data_url, resolveImageFormat(letterhead.logo_data_url), margin, ctx.y, 55, 55); } catch {}
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setColor(doc, PDF_COLORS.DARK_BLUE);
  doc.text(letterhead.doctor_name || "Dr.", pageWidth - margin - doc.getTextWidth(letterhead.doctor_name || "Dr."), ctx.y + 14);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setColor(doc, PDF_COLORS.LIGHT_TEXT);
  const infoLines = [
    `${letterhead.specialties || "Medicina General"}`,
    letterhead.address || "",
    `Tel: ${letterhead.phone_primary}`
  ];
  let ph3Y = ctx.y + 28;
  for (const line of infoLines) {
    if (line.trim()) {
      doc.text(line, pageWidth - margin - doc.getTextWidth(line), ph3Y);
      ph3Y += 12;
    }
  }
  ctx.y = Math.max(ph3Y, ctx.y + 60) + 10;

  // Title banner verde
  doc.setFillColor(22, 101, 52);
  doc.rect(margin, ctx.y, contentWidth, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  setColor(doc, PDF_COLORS.WHITE);
  const p3Title = "HOJA DE INSTRUCCIONES PARA EL PACIENTE";
  doc.text(p3Title, pageWidth / 2 - doc.getTextWidth(p3Title) / 2, ctx.y + 17);
  ctx.y += 36;

  // Paciente + fecha
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  setColor(doc, PDF_COLORS.DARK_BLUE);
  doc.text(`Paciente: ${data.patientName}`, margin, ctx.y);
  doc.setFont("helvetica", "normal");
  setColor(doc, PDF_COLORS.LIGHT_TEXT);
  const fechaStr = `Fecha: ${data.consultationDate.split(",")[0]}`;
  doc.text(fechaStr, pageWidth - margin - doc.getTextWidth(fechaStr), ctx.y);
  ctx.y += 34;

  const drawPatientSection = (title: string, content: string, iconColor: string) => {
    checkPageBreak(ctx, 60);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, ctx.y, contentWidth, 22, "F");
    const [ir, ig, ib] = iconColor.split(",").map(Number);
    doc.setFillColor(ir, ig, ib);
    doc.rect(margin, ctx.y, 4, 22, "F");
    
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, ctx.y, margin + contentWidth, ctx.y);
    doc.line(margin, ctx.y + 22, margin + contentWidth, ctx.y + 22);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(doc, PDF_COLORS.DARK_BLUE);
    doc.text(title, margin + 14, ctx.y + 15);
    ctx.y += 30;
    
    const lines = doc.splitTextToSize(content, contentWidth - 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    setColor(doc, PDF_COLORS.TEXT);
    for (const line of lines) {
      checkPageBreak(ctx, 16);
      const printLine = line.trim().startsWith("•") || line.trim().startsWith("-") ? line : `• ${line}`;
      doc.text(printLine, margin + 12, ctx.y);
      ctx.y += 14;
    }
    ctx.y += 14;
  };

  if (data.medicationInstructions) {
    drawPatientSection("CÓMO TOMAR SU MEDICACIÓN", data.medicationInstructions, "37,99,235");
  }

  if (data.recommendations) {
    drawPatientSection("RECOMENDACIONES GENERALES", data.recommendations, "5,150,105");
  }

  if (data.warningSigns) {
    checkPageBreak(ctx, 70);
    const wLines = doc.splitTextToSize(data.warningSigns, contentWidth - 20);
    const wBox = wLines.length * 14 + 44;
    doc.setFillColor(254, 242, 242);
    doc.rect(margin, ctx.y, contentWidth, wBox, "F");
    doc.setFillColor(220, 38, 38);
    doc.rect(margin, ctx.y, 4, wBox, "F");
    
    doc.setDrawColor(220, 38, 38);
    doc.setLineWidth(1);
    doc.line(margin, ctx.y, margin + contentWidth, ctx.y);
    doc.line(margin, ctx.y + wBox, margin + contentWidth, ctx.y + wBox);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setColor(doc, PDF_COLORS.RED);
    doc.text("! SIGNOS DE ALARMA - ACUDA A URGENCIAS SI PRESENTA:", margin + 14, ctx.y + 18);
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(127, 29, 19);
    let wy = ctx.y + 34;
    for (const line of wLines) {
      const printLine = line.trim().startsWith("•") || line.trim().startsWith("-") ? line : `• ${line}`;
      doc.text(printLine, margin + 14, wy);
      wy += 14;
    }
    ctx.y += wBox + 16;
  }

  if (data.followUpDate) {
    checkPageBreak(ctx, 50);
    doc.setFillColor(240, 253, 244);
    doc.rect(margin, ctx.y, contentWidth, 40, "F");
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(1);
    doc.line(margin, ctx.y, margin + contentWidth, ctx.y);
    doc.line(margin, ctx.y + 40, margin + contentWidth, ctx.y + 40);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 83, 45);
    doc.text("PROXIMA CITA MEDICA:", margin + 14, ctx.y + 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(13);
    doc.text(data.followUpDate, margin + 14, ctx.y + 32);
    ctx.y += 54;
  }

  // Footer
  ctx.y = Math.max(ctx.y + 20, pageHeight - 50);
  drawPageFooter(ctx, `Emitido el ${data.consultationDate.split(",")[0]} · Dr. ${letterhead.doctor_name}`);
}
