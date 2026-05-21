import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  resolveImageFormat,
  calculateAge,
  setColor,
  setFill,
  checkPageBreak,
  drawSectionHeader,
  drawBlock,
} from "@/features/consultations/lib/pdf/pdf-helpers";
import type { jsPDF } from "jspdf";
import type { PdfContext } from "@/features/consultations/lib/pdf/pdf-types";

describe("pdf-helpers", () => {
  describe("resolveImageFormat", () => {
    it("resolves JPEG", () => {
      expect(resolveImageFormat("data:image/jpeg;base64,123")).toBe("JPEG");
      expect(resolveImageFormat("data:image/jpg;base64,123")).toBe("JPEG");
    });
    it("resolves WEBP", () => {
      expect(resolveImageFormat("data:image/webp;base64,123")).toBe("WEBP");
    });
    it("defaults to PNG", () => {
      expect(resolveImageFormat("data:image/png;base64,123")).toBe("PNG");
      expect(resolveImageFormat("some-random-string")).toBe("PNG");
    });
  });

  describe("calculateAge", () => {
    it("calculates age correctly", () => {
      const now = new Date();
      const birthDate = new Date(now.getFullYear() - 30, now.getMonth(), now.getDate() - 1);
      expect(calculateAge(birthDate.toISOString())).toBe("30 años");
    });
    it("returns N/A for invalid dates", () => {
      expect(calculateAge("")).toBe("N/A");
      expect(calculateAge("invalid-date")).toBe("N/A");
    });
  });

  describe("jsPDF interactions", () => {
    let mockDoc: Record<string, unknown>;
    let mockCtx: PdfContext;

    beforeEach(() => {
      mockDoc = {
        setTextColor: vi.fn(),
        setFillColor: vi.fn(),
        addPage: vi.fn(),
        rect: vi.fn(),
        setDrawColor: vi.fn(),
        setLineWidth: vi.fn(),
        line: vi.fn(),
        setFont: vi.fn(),
        setFontSize: vi.fn(),
        text: vi.fn(),
        getTextWidth: vi.fn().mockReturnValue(20),
        splitTextToSize: vi.fn((text) => [text]), // Return single line by default
      };

      mockCtx = {
        doc: mockDoc as unknown as jsPDF,
        y: 100,
        margin: 20,
        contentWidth: 170,
        pageHeight: 297,
        pageWidth: 210,
        watermarkUrl: "",
        hasWatermark: false,
      };
    });

    describe("setColor & setFill", () => {
      it("parses hex correctly for setColor", () => {
        setColor(mockDoc, "#FF00AA");
        expect(mockDoc.setTextColor).toHaveBeenCalledWith(255, 0, 170);
      });
      it("parses hex correctly for setFill", () => {
        setFill(mockDoc, "#00FF00");
        expect(mockDoc.setFillColor).toHaveBeenCalledWith(0, 255, 0);
      });
    });

    describe("checkPageBreak", () => {
      it("does not break if space is sufficient", () => {
        mockCtx.y = 100;
        const broken = checkPageBreak(mockCtx, 50);
        expect(broken).toBe(false);
        expect(mockDoc.addPage).not.toHaveBeenCalled();
      });
      it("adds page if space is insufficient", () => {
        mockCtx.y = 250;
        const broken = checkPageBreak(mockCtx, 50); // 250 + 50 = 300 > 297 - 20 (277)
        expect(broken).toBe(true);
        expect(mockDoc.addPage).toHaveBeenCalled();
        expect(mockCtx.y).toBe(20); // Resets to margin
      });
    });

    describe("drawSectionHeader", () => {
      it("draws rectangles, lines, and text", () => {
        drawSectionHeader(mockCtx, "Diagnóstico");
        expect(mockDoc.rect).toHaveBeenCalledTimes(2);
        expect(mockDoc.line).toHaveBeenCalledTimes(2);
        expect(mockDoc.text).toHaveBeenCalledWith("DIAGNÓSTICO", 34, 115);
        expect(mockCtx.y).toBe(132); // 100 + 32
      });
    });

    describe("drawBlock", () => {
      it("does nothing if text is empty", () => {
        drawBlock(mockCtx, "Label", "");
        expect(mockDoc.text).not.toHaveBeenCalled();
      });

      it("draws standard block without bullets", () => {
        drawBlock(mockCtx, "Label", "Simple text");
        expect(mockDoc.text).toHaveBeenCalledWith("Label:", 20, 100);
        expect(mockDoc.text).toHaveBeenCalledWith("Simple text", 46, 100); // 20 + 20(width) + 6
        expect(mockCtx.y).toBe(121); // 100 + 13 + 8
      });

      it("draws bulleted block if text has newlines", () => {
        drawBlock(mockCtx, "List", "Item 1\nItem 2");
        expect(mockDoc.text).toHaveBeenCalledWith("LIST", 20, 100);
        expect(mockDoc.text).toHaveBeenCalledWith("Item 1\nItem 2", 28, 113); // splitTextToSize returns 1 element here
        expect(mockCtx.y).toBe(134); // 100 + 13 + 13 + 8
      });
    });
  });
});
