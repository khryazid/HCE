import { jsPDF } from "jspdf";
import * as fs from "fs";
import * as path from "path";

function generateManualPDF() {
  const mdPath = path.join(process.cwd(), "docs", "MANUAL_USUARIO.md");
  const pdfOutputDir = path.join(process.cwd(), "public");
  const pdfOutputPath = path.join(pdfOutputDir, "manual_de_usuario.pdf");

  if (!fs.existsSync(mdPath)) {
    console.error("No se encontró docs/MANUAL_USUARIO.md");
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(mdPath, "utf-8");
  const lines = markdownContent.split(/\r?\n/);

  // Initialize jsPDF (A4 Portrait, units in mm)
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2; // 170mm
  const bottomThreshold = 270; // Break page if y > 270

  let y = margin;
  let pageNumber = 1;

  // Professional color palette matching Glyph's HSL (Teal, slate)
  const colors = {
    primary: [13, 148, 136],   // Teal #0d9488
    accent: [124, 58, 237],   // Purple #7c3aed
    textDark: [15, 23, 42],   // Dark slate #0f172a
    textMuted: [100, 116, 139], // Muted grey #64748b
    lightBg: [248, 250, 252],  // Light blue-grey #f8fafc
    border: [226, 232, 240]    // Border #e2e8f0
  };

  // Helper to draw clean footers on all pages
  function drawFooter(pageIdx: number) {
    doc.setPage(pageIdx);
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
    
    // Draw footer line
    doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, 280, pageWidth - margin, 280);

    // Left text
    doc.text("Glyph — Motor Clínico Inteligente ⚕️", margin, 285);
    // Right text
    doc.text(`Página ${pageIdx}`, pageWidth - margin, 285, { align: "right" });
  }

  // Cover Page
  doc.setFillColor(11, 15, 25); // Sleek dark #0b0f19
  doc.rect(0, 0, pageWidth, pageHeight, "F");

  // Glowing visual accent block on cover page
  doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.rect(margin, 50, 5, 80, "F");

  // Cover Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(255, 255, 255);
  doc.text("Glyph", margin + 15, 70);

  doc.setFontSize(20);
  doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
  doc.text("Motor Clínico Inteligente ⚕️", margin + 15, 82);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(200, 200, 200);
  doc.text("MANUAL DE USUARIO OFICIAL", margin + 15, 96);
  doc.setFontSize(11);
  doc.setTextColor(150, 150, 150);
  doc.text("Historia Clínica Electrónica: Offline-First, IA-Powered y Multi-tenant.", margin + 15, 106);

  // Release Info
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text("Versión del Manual: 1.2 (Producción)", margin + 15, 240);
  doc.text("Fecha del Reporte: Mayo de 2026", margin + 15, 246);
  doc.text("Distribución: Licencia MIT / Confidencialidad Médica", margin + 15, 252);

  // Add the first content page
  doc.addPage();
  y = margin;
  pageNumber++;

  // Process Markdown Line-by-Line
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines, but close list if open
    if (line === "") {
      if (inList) {
        y += 2;
        inList = false;
      }
      y += 4;
      continue;
    }

    // Page overflow safety check
    if (y > bottomThreshold) {
      doc.addPage();
      pageNumber++;
      y = margin;
    }

    // Parse H1 Heading: # Heading Title (Skip cover heading if repeating)
    if (line.startsWith("# ") && !line.includes("Manual de Usuario — Glyph HCE")) {
      const titleText = line.substring(2).trim();
      y += 6;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      
      // Draw H1 text
      doc.text(titleText, margin, y);
      
      // Draw dynamic accent underline
      y += 2;
      doc.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.setLineWidth(0.8);
      doc.line(margin, y, margin + 40, y);
      y += 6;
      continue;
    }

    // Parse H2 Heading: ## Heading Title
    if (line.startsWith("## ")) {
      const titleText = line.substring(3).trim();
      y += 8;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(colors.accent[0], colors.accent[1], colors.accent[2]);
      doc.text(titleText, margin, y);
      
      y += 1.5;
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.4);
      doc.line(margin, y, margin + 80, y);
      y += 5;
      continue;
    }

    // Parse H3 Heading: ### Heading Title
    if (line.startsWith("### ")) {
      const titleText = line.substring(4).trim();
      y += 5;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);
      doc.text(titleText, margin, y);
      y += 4;
      continue;
    }

    // Parse Horizontal Rules: ---
    if (line === "---") {
      y += 3;
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      continue;
    }

    // Parse Blockquotes / Alerts: > Text or | (tables) - simplify to bullet layout or nice text blocks
    if (line.startsWith(">")) {
      let quoteText = line.substring(1).trim();
      if (quoteText.startsWith("[!NOTE]") || quoteText.startsWith("[!TIP]") || quoteText.startsWith("[!IMPORTANT]") || quoteText.startsWith("[!WARNING]") || quoteText.startsWith("[!CAUTION]")) {
        // Strip out github alert tokens
        quoteText = quoteText.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/, "").trim();
      }
      
      y += 3;
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);
      
      const splitQuote = doc.splitTextToSize(quoteText, contentWidth - 10);
      
      // Draw alert callout background box
      const boxHeight = splitQuote.length * 4.5 + 4;
      doc.setFillColor(colors.lightBg[0], colors.lightBg[1], colors.lightBg[2]);
      doc.rect(margin, y - 2, contentWidth, boxHeight, "F");
      
      // Highlight sidebar
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.rect(margin, y - 2, 1.5, boxHeight, "F");

      doc.text(splitQuote, margin + 5, y + 2.5);
      y += boxHeight + 4;
      continue;
    }

    // Parse Tables (simplified parsing for rows starting/ending with | )
    if (line.startsWith("|") && i + 1 < lines.length && lines[i+1].includes("---")) {
      // Table Header row
      const headers = line.split("|").map(s => s.trim()).filter(s => s !== "");
      y += 4;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);

      const cellWidth = contentWidth / headers.length;
      
      // Draw Header background
      doc.setFillColor(colors.lightBg[0], colors.lightBg[1], colors.lightBg[2]);
      doc.rect(margin, y - 2, contentWidth, 7, "F");

      for (let cellIdx = 0; cellIdx < headers.length; cellIdx++) {
        doc.text(headers[cellIdx], margin + cellIdx * cellWidth + 2, y + 2.5);
      }
      y += 8;
      
      // Skip the separator row (e.g. |---|---|)
      i++;
      continue;
    } else if (line.startsWith("|")) {
      // Regular table data row
      const cells = line.split("|").map(s => s.trim()).filter(s => s !== "");
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(colors.textMuted[0], colors.textMuted[1], colors.textMuted[2]);

      const cellWidth = contentWidth / cells.length;
      
      // Draw thin row border
      doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
      doc.setLineWidth(0.1);
      doc.line(margin, y - 2, pageWidth - margin, y - 2);

      let maxHeight = 4;
      for (let cellIdx = 0; cellIdx < cells.length; cellIdx++) {
        const wrappedCell = doc.splitTextToSize(cells[cellIdx], cellWidth - 4);
        maxHeight = Math.max(maxHeight, wrappedCell.length * 4);
        doc.text(wrappedCell, margin + cellIdx * cellWidth + 2, y + 1.5);
      }
      y += maxHeight + 1;
      continue;
    }

    // Parse Bullet Lists: * text, - text, or 1. text
    const listPattern = /^([\*\-\+])\s+(.*)$/;
    const numListPattern = /^(\d+)\.\s+(.*)$/;
    
    if (listPattern.test(line)) {
      inList = true;
      const match = line.match(listPattern);
      const text = match ? match[2] : "";

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);

      // Draw custom bullet circle
      doc.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
      doc.circle(margin + 3, y + 1.2, 0.8, "F");

      const splitText = doc.splitTextToSize(text, contentWidth - 8);
      doc.text(splitText, margin + 8, y + 2);
      y += splitText.length * 4.5 + 1.5;
      continue;
    }

    if (numListPattern.test(line)) {
      inList = true;
      const match = line.match(numListPattern);
      const num = match ? match[1] : "1";
      const text = match ? match[2] : "";

      doc.setFont("Helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);

      // Draw list number
      doc.setFont("Helvetica", "bold");
      doc.text(`${num}.`, margin + 2, y + 2);
      doc.setFont("Helvetica", "normal");

      const splitText = doc.splitTextToSize(text, contentWidth - 8);
      doc.text(splitText, margin + 8, y + 2);
      y += splitText.length * 4.5 + 1.5;
      continue;
    }

    // Parse Standard Paragraph
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(colors.textDark[0], colors.textDark[1], colors.textDark[2]);

    // Handle bolding markers in standard text **bold** -> remove for clean PDF display
    const sanitizedLine = line.replace(/\*\*/g, "");

    const splitParagraph = doc.splitTextToSize(sanitizedLine, contentWidth);
    doc.text(splitParagraph, margin, y + 2);
    y += splitParagraph.length * 4.5 + 3.5;
  }

  // Draw footers on every page except cover (page 1)
  const totalPages = doc.getNumberOfPages();
  for (let pageIdx = 2; pageIdx <= totalPages; pageIdx++) {
    drawFooter(pageIdx);
  }

  // Ensure output directory exists
  if (!fs.existsSync(pdfOutputDir)) {
    fs.mkdirSync(pdfOutputDir, { recursive: true });
  }

  // Save the document
  const pdfBytes = doc.output("arraybuffer");
  fs.writeFileSync(pdfOutputPath, Buffer.from(pdfBytes));

  console.log(`¡PDF del manual generado exitosamente en: ${pdfOutputPath}!`);
  console.log(`Total de páginas: ${totalPages}`);
}

generateManualPDF();
