import { describe, it, expect } from "vitest";
import { validateWizardForm, buildPendingFollowUp, type WizardValidationInput } from "@/features/consultations/lib/wizard-domain";
import type { ClinicalRecordRecord } from "@/features/consultations/types";

describe("wizard-domain validations", () => {
  describe("validateWizardForm", () => {
    const baseInput: WizardValidationInput = {
      patientId: "patient-123",
      entryMode: "consulta",
      chiefComplaint: "Dolor de cabeza",
      diagnosis: "Migraña",
      treatmentPlan: "Ibuprofeno 400mg",
      evolutionStatus: "",
    };

    it("should return no errors for a valid consulta form", () => {
      const errors = validateWizardForm(baseInput);
      expect(errors).toEqual({});
    });

    it("should return no errors for a valid seguimiento form", () => {
      const input: WizardValidationInput = {
        ...baseInput,
        entryMode: "seguimiento",
        evolutionStatus: "Mejora progresiva",
      };
      const errors = validateWizardForm(input);
      expect(errors).toEqual({});
    });

    it("should require patientId", () => {
      const errors = validateWizardForm({ ...baseInput, patientId: "" });
      expect(errors.patientId).toBeDefined();
    });

    it("should require chiefComplaint only in consulta mode", () => {
      const errors = validateWizardForm({ ...baseInput, chiefComplaint: "" });
      expect(errors.chiefComplaint).toBeDefined();

      const trackingErrors = validateWizardForm({
        ...baseInput,
        entryMode: "seguimiento",
        chiefComplaint: "",
        evolutionStatus: "Estable",
      });
      expect(trackingErrors.chiefComplaint).toBeUndefined();
    });

    it("should require diagnosis in all modes", () => {
      const errors = validateWizardForm({ ...baseInput, diagnosis: "" });
      expect(errors.diagnosis).toBeDefined();
    });

    it("should require treatmentPlan in consulta mode", () => {
      const errors = validateWizardForm({ ...baseInput, treatmentPlan: "" });
      expect(errors.treatmentPlan).toBeDefined();
    });

    it("should require evolutionStatus in seguimiento mode", () => {
      const errors = validateWizardForm({
        ...baseInput,
        entryMode: "seguimiento",
        evolutionStatus: "",
      });
      expect(errors.evolutionStatus).toBeDefined();
    });
  });

  describe("buildPendingFollowUp", () => {
    const baseRecord = {
      id: "record-123",
      patient_id: "patient-1",
      doctor_id: "doc-1",
      clinic_id: "clinic-1",
      specialty_kind: "medicina-general",
      chief_complaint: "Consulta general",
      physical_exam: "",
      clinical_analysis: "",
      cie_codes: [],
      specialty_data: {},
      status: "completed",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as ClinicalRecordRecord;

    it("should return null if no record is provided", () => {
      expect(buildPendingFollowUp(null)).toBeNull();
    });

    it("should return null if next_follow_up_date is missing", () => {
      expect(buildPendingFollowUp(baseRecord)).toBeNull();
    });

    it("should build follow up object if next_follow_up_date is present", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const recordWithFollowUp = {
        ...baseRecord,
        specialty_data: {
          next_follow_up_date: futureDate,
          diagnosis: "Hipertensión",
          treatment_plan: "Losartán 50mg",
        },
      };

      const result = buildPendingFollowUp(recordWithFollowUp, Date.now());
      expect(result).toBeDefined();
      expect(result?.isOverdue).toBe(false);
      expect(result?.diagnosis).toBe("Hipertensión");
      expect(result?.treatmentPlan).toBe("Losartán 50mg");
    });

    it("should mark as overdue if date is in the past", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const recordWithFollowUp = {
        ...baseRecord,
        specialty_data: {
          next_follow_up_date: pastDate,
        },
      };

      const result = buildPendingFollowUp(recordWithFollowUp, Date.now());
      expect(result?.isOverdue).toBe(true);
    });
  });
});
