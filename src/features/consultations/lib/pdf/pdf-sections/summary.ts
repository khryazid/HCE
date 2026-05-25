import type { PdfContext } from "../pdf-types";
import { setColor, setFill, drawSectionHeader, drawBlock, checkPageBreak, calculateAge } from "../pdf-helpers";
import { PDF_COLORS } from "../pdf-constants";

export function drawSummaryPage(ctx: PdfContext) {
  const { doc, data, margin, pageWidth, contentWidth } = ctx;

  // --- Title Banner ---
  setFill(doc, PDF_COLORS.DARK_BLUE);
  doc.rect(margin, ctx.y, contentWidth, 24, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setColor(doc, PDF_COLORS.WHITE);
  const titleText = "HISTORIA CLÍNICA Y PLAN DE MANEJO";
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, pageWidth / 2 - titleWidth / 2, ctx.y + 16);
  ctx.y += 40;

  // --- 1. IDENTIFICACIÓN DEL PACIENTE ---
  drawSectionHeader(ctx, "IDENTIFICACIÓN DEL PACIENTE");
  
  doc.setFontSize(10);
  const drawPatientGrid = () => {
    const col1 = margin;
    const col2 = margin + 110;
    const col3 = margin + 280;
    const col4 = margin + 360;

    setColor(doc, PDF_COLORS.DARK_BLUE);
    doc.setFont("helvetica", "bold");
    doc.text("Nombre Completo:", col1, ctx.y);
    doc.text("Edad:", col1, ctx.y + 20);
    doc.text("Ocupación:", col1, ctx.y + 40);

    doc.text("Documento:", col3, ctx.y);
    doc.text("Género:", col3, ctx.y + 20);
    doc.text("Fecha/Hora:", col3, ctx.y + 40);

    setColor(doc, PDF_COLORS.TEXT);
    doc.setFont("helvetica", "normal");
    doc.text(data.patientName, col2, ctx.y);
    doc.text(data.birthDate ? calculateAge(data.birthDate) : "N/A", col2, ctx.y + 20);
    doc.text(data.occupation ? data.occupation.charAt(0).toUpperCase() + data.occupation.slice(1).toLowerCase() : "No esp.", col2, ctx.y + 40);

    doc.text(data.patientDocument, col4, ctx.y);
    doc.text(data.gender ? data.gender.charAt(0).toUpperCase() + data.gender.slice(1).toLowerCase() : "No esp.", col4, ctx.y + 20);
    doc.text(data.consultationDate, col4, ctx.y + 40);
    
    ctx.y += 70;
  };
  drawPatientGrid();

  // --- 2. MOTIVO DE CONSULTA Y ANAMNESIS ---
  checkPageBreak(ctx, 100);
  drawSectionHeader(ctx, "MOTIVO DE CONSULTA Y ANAMNESIS");

  drawBlock(ctx, "Motivo", data.chiefComplaint);
  drawBlock(ctx, "Enfermedad Actual", data.anamnesis);
  
  if (data.backgrounds && Object.values(data.backgrounds).some(val => val.trim() !== "")) {
    if (data.backgrounds.pathological) drawBlock(ctx, "Ant. Patológicos", data.backgrounds.pathological);
    if (data.backgrounds.surgical) drawBlock(ctx, "Ant. Quirúrgicos", data.backgrounds.surgical);
    if (data.backgrounds.allergic) drawBlock(ctx, "Ant. Alérgicos", data.backgrounds.allergic);
    if (data.backgrounds.pharmacological) drawBlock(ctx, "Ant. Farmacológicos", data.backgrounds.pharmacological);
    if (data.backgrounds.family) drawBlock(ctx, "Ant. Familiares", data.backgrounds.family);
    if (data.backgrounds.toxic) drawBlock(ctx, "Ant. Hábitos / Tóxicos", data.backgrounds.toxic);
    if (data.gender === "Femenino" && data.backgrounds.gynecoObstetric) {
      drawBlock(ctx, "Ant. Gineco-obstétricos", data.backgrounds.gynecoObstetric);
    }
  } else if (data.medicalHistory) {
    drawBlock(ctx, "Antecedentes", data.medicalHistory);
  }

  ctx.y += 16;

  // --- 3. EXAMEN FÍSICO Y SIGNOS VITALES ---
  checkPageBreak(ctx, 140);
  drawSectionHeader(ctx, "EXAMEN FÍSICO Y SIGNOS VITALES");

  const drawVitals = () => {
    let bmiText = "";
    if (data.vitalSigns.weight && data.vitalSigns.height) {
      const w = parseFloat(data.vitalSigns.weight.replace(",", "."));
      const h = parseFloat(data.vitalSigns.height.replace(",", "."));
      if (!isNaN(w) && !isNaN(h) && h > 0.5) {
        const bmi = w / (h * h);
        let lbl = "Normal";
        if (bmi < 18.5) lbl = "Bajo peso";
        else if (bmi >= 25 && bmi < 30) lbl = "Sobrepeso";
        else if (bmi >= 30) lbl = "Obesidad";
        bmiText = `${bmi.toFixed(1)} (${lbl})`;
      }
    }

    let taRed = false, fcRed = false, frRed = false, satRed = false;
    if (data.vitalSigns.bloodPressure) {
      const bpMatch = data.vitalSigns.bloodPressure.match(/(\d+)\s*\/\s*(\d+)/);
      if (bpMatch && (parseInt(bpMatch[1]) >= 140 || parseInt(bpMatch[2]) >= 90)) taRed = true;
    }
    if (data.vitalSigns.heartRate) { const hr = parseInt(data.vitalSigns.heartRate); if (hr >= 100 || hr < 50) fcRed = true; }
    if (data.vitalSigns.respiratoryRate && parseInt(data.vitalSigns.respiratoryRate) >= 22) frRed = true;
    if (data.vitalSigns.oxygenSaturation && parseInt(data.vitalSigns.oxygenSaturation) <= 90) satRed = true;

    const vitals = [
      { label: "Tensión Arterial",  unit: "mmHg",  val: data.vitalSigns.bloodPressure,     isRed: taRed  },
      { label: "Frec. Cardíaca",    unit: "lpm",   val: data.vitalSigns.heartRate,          isRed: fcRed  },
      { label: "Frec. Resp.",       unit: "rpm",   val: data.vitalSigns.respiratoryRate,    isRed: frRed  },
      { label: "Saturación O2",     unit: "%",     val: data.vitalSigns.oxygenSaturation,   isRed: satRed },
      { label: "Temperatura",       unit: "°C",    val: data.vitalSigns.temperature,        isRed: false  },
      { label: "Peso",              unit: "kg",    val: data.vitalSigns.weight,             isRed: false  },
      { label: "Talla",             unit: "m",     val: data.vitalSigns.height,             isRed: false  },
      { label: "IMC",               unit: "",      val: bmiText,                            isRed: false  },
    ].filter(v => v.val && v.val.trim() !== "");

    if (vitals.length === 0) return;

    const cols = Math.min(vitals.length, 4);
    const cardW = contentWidth / cols;
    const cardH = 54;
    const cardPad = 3;

    for (let i = 0; i < vitals.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = margin + col * cardW;
      const cy = ctx.y + row * (cardH + 4);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(cx + cardPad, cy, cardW - cardPad * 2, cardH, 3, 3, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setColor(doc, PDF_COLORS.LIGHT_TEXT);
      const lbl = vitals[i].label;
      const lblW = doc.getTextWidth(lbl);
      doc.text(lbl, cx + cardW / 2 - lblW / 2, cy + 18);

      const displayVal = vitals[i].unit ? `${vitals[i].val} ${vitals[i].unit}` : vitals[i].val;
      if (vitals[i].isRed) setColor(doc, PDF_COLORS.RED);
      else setColor(doc, PDF_COLORS.TEXT);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const valW = doc.getTextWidth(displayVal);
      doc.text(displayVal, cx + cardW / 2 - valW / 2, cy + 40);
    }

    const rows = Math.ceil(vitals.length / cols);
    ctx.y += rows * (cardH + 4) + 8;
  };
  drawVitals();

  if (data.physicalExamStructured && data.physicalExamStructured.length > 0) {
    for (const ex of data.physicalExamStructured) {
      drawBlock(ctx, ex.system.toUpperCase(), ex.content);
    }
  } else if (data.physicalExam) {
    drawBlock(ctx, "Hallazgos", data.physicalExam);
  }
  ctx.y += 16;

  // --- 4. IMPRESIÓN DIAGNÓSTICA ---
  checkPageBreak(ctx, 100);
  drawSectionHeader(ctx, "IMPRESIÓN DIAGNÓSTICA");

  doc.setDrawColor(209, 213, 219);
  doc.setLineDashPattern([3, 3], 0);
  
  doc.setFontSize(10);
  const diagLines = doc.splitTextToSize(`${data.cieCodes.join(", ") || "No espec."} - ${data.diagnosis}`, contentWidth - 50);
  const analLines = data.clinicalAnalysis ? doc.splitTextToSize(data.clinicalAnalysis, contentWidth - 65) : [];
  
  const boxHeight = (diagLines.length + analLines.length) * 14 + (data.clinicalAnalysis ? 30 : 20);
  checkPageBreak(ctx, boxHeight + 20);

  doc.rect(margin, ctx.y, contentWidth, boxHeight);
  doc.setLineDashPattern([], 0);
  
  ctx.y += 15;
  doc.setFont("helvetica", "bold");
  setColor(doc, PDF_COLORS.TEXT);
  doc.text("CIE:", margin + 10, ctx.y);
  doc.setFont("helvetica", "normal");
  
  const maxCieWidth = contentWidth - 45;
  const safeDiagLines = doc.splitTextToSize(`${data.cieCodes.join(", ") || "No espec."} - ${data.diagnosis}`, maxCieWidth);
  doc.text(safeDiagLines, margin + 40, ctx.y);
  ctx.y += safeDiagLines.length * 14 + 5;

  if (data.clinicalAnalysis) {
    doc.setFont("helvetica", "bold");
    doc.text("Análisis:", margin + 10, ctx.y);
    doc.setFont("helvetica", "normal");
    doc.text(analLines, margin + 55, ctx.y);
    ctx.y += analLines.length * 14;
  }
  ctx.y += 25;
}
