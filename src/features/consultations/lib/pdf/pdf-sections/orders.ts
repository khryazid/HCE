import type { PdfContext } from "../pdf-types";
import { setColor, checkPageBreak } from "../pdf-helpers";
import { PDF_COLORS } from "../pdf-constants";
import { drawPageFooter, drawSignatureLine } from "./header-footer";

export function drawOrdersPage(ctx: PdfContext) {
  const { doc, data, letterhead, margin, pageWidth, contentWidth } = ctx;

  const hasParaclinicos = (data.labOrders?.length ?? 0) > 0 || (data.imagingOrders?.length ?? 0) > 0;
  if (!hasParaclinicos) return;

  doc.addPage();
  ctx.y = margin;

  // Header mínimo: solo doctor y fecha
  doc.setFont("SpaceGrotesk", "bold");
  doc.setFontSize(14);
  setColor(doc, PDF_COLORS.DARK_BLUE);
  doc.text(letterhead.doctor_name || "", margin, ctx.y + 14);
  
  doc.setFont("SpaceGrotesk", "normal");
  doc.setFontSize(9);
  setColor(doc, PDF_COLORS.LIGHT_TEXT);
  const infoLines = [
    `${letterhead.specialties || "Medicina General"} ${letterhead.professional_title ? `| Reg. Médico: ${letterhead.professional_title}` : ""}`,
    letterhead.address || "",
    `Tel: ${letterhead.phone_primary} ${letterhead.contact_email ? `| ${letterhead.contact_email}` : ""}`
  ];
  
  let phY = ctx.y + 26;
  for (const line of infoLines) {
    if (line.trim()) { doc.text(line, margin, phY); phY += 12; }
  }
  
  const orderDate = data.consultationDate.split(",")[0];
  doc.setFontSize(9);
  const dateStr = `Fecha: ${orderDate}`;
  doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), ctx.y + 14);
  ctx.y = Math.max(phY, ctx.y + 60) + 8;

  // Banner naranja
  doc.setFillColor(154, 52, 18);
  doc.rect(margin, ctx.y, contentWidth, 26, "F");
  doc.setFont("SpaceGrotesk", "bold");
  doc.setFontSize(12);
  setColor(doc, PDF_COLORS.WHITE);
  const p4Title = "ORDEN DE ESTUDIOS PARACLÍNICOS";
  doc.text(p4Title, pageWidth / 2 - doc.getTextWidth(p4Title) / 2, ctx.y + 17);
  ctx.y += 36;

  // Solo nombre del paciente
  doc.setFont("SpaceGrotesk", "bold");
  doc.setFontSize(10);
  setColor(doc, PDF_COLORS.DARK_BLUE);
  doc.text(`Paciente: ${data.patientName}`, margin, ctx.y);
  doc.setFont("SpaceGrotesk", "normal");
  setColor(doc, PDF_COLORS.LIGHT_TEXT);
  doc.text(dateStr, pageWidth - margin - doc.getTextWidth(dateStr), ctx.y);
  ctx.y += 34;

  const drawOrderSection = (title: string, items: string[], accentRgb: string) => {
    checkPageBreak(ctx, 60);
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, ctx.y, contentWidth, 22, "F");
    const [or, og, ob] = accentRgb.split(",").map(Number);
    doc.setFillColor(or, og, ob);
    doc.rect(margin, ctx.y, 4, 22, "F");
    
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.line(margin, ctx.y, margin + contentWidth, ctx.y);
    doc.line(margin, ctx.y + 22, margin + contentWidth, ctx.y + 22);

    doc.setFont("SpaceGrotesk", "bold");
    doc.setFontSize(10);
    setColor(doc, PDF_COLORS.DARK_BLUE);
    doc.text(title, margin + 14, ctx.y + 15);
    ctx.y += 30;
    
    doc.setFont("SpaceGrotesk", "normal");
    doc.setFontSize(10);
    setColor(doc, PDF_COLORS.TEXT);
    for (const item of items) {
      checkPageBreak(ctx, 16);
      doc.text(`•  ${item}`, margin + 14, ctx.y);
      ctx.y += 16;
    }
    ctx.y += 12;
  };

  if (data.labOrders && data.labOrders.length > 0) {
    drawOrderSection("LABORATORIO", data.labOrders, "234,88,12");
  }

  if (data.imagingOrders && data.imagingOrders.length > 0) {
    drawOrderSection("IMAGENOLOGÍA / DIAGNÓSTICO POR IMAGEN", data.imagingOrders, "79,70,229");
  }

  // Firma
  drawSignatureLine(ctx);

  // Footer
  ctx.y += 44;
  drawPageFooter(ctx, `Orden emitida el ${orderDate} · Dr. ${letterhead.doctor_name} — Válida solo con firma y sello.`);
}
