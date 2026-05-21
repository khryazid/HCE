import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildNextTemplate,
  listTreatmentTemplates,
  saveTreatmentTemplate,
  deleteTreatmentTemplate,
  migrateLegacyLocalStorageTemplates,
} from "@/features/consultations/lib/treatments";
import * as supabaseClient from "@/lib/supabase/client";

// Mocks
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockUpsert = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockSingle = vi.fn();

const mockTable = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  upsert: mockUpsert,
};

// Setup chaining
mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
mockEq.mockReturnValue({ order: mockOrder, select: mockSelect, single: mockSingle });
mockOrder.mockResolvedValue({ data: [], error: null });
mockInsert.mockReturnValue({ select: mockSelect });
mockUpdate.mockReturnValue({ eq: mockEq });
mockDelete.mockReturnValue({ eq: mockEq });
mockSingle.mockResolvedValue({ data: { id: "123" }, error: null });
mockUpsert.mockResolvedValue({ error: null });

vi.spyOn(supabaseClient, "getSupabaseClient").mockReturnValue({
  from: vi.fn().mockReturnValue(mockTable),
} as unknown as ReturnType<typeof supabaseClient.getSupabaseClient>);

describe("treatment templates storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockResolvedValue({ data: [{ id: "1" }, { id: "2" }], error: null });
    mockSingle.mockResolvedValue({ data: { id: "1", title: "Test" }, error: null });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("versioning", () => {
    it("creates template version 1 then updates to version 2", () => {
      const base = buildNextTemplate(
        { doctor_id: "doc-1", clinic_id: "clin-1", trigger: "hipertension", title: "HTA", treatment: "Dieta" },
      );
      const updated = buildNextTemplate(
        { doctor_id: "doc-1", clinic_id: "clin-1", trigger: "hipertension", title: "HTA", treatment: "Dieta y pastilla" },
        base,
      );
      expect(base.current_version).toBe(1);
      expect(updated.current_version).toBe(2);
      expect(updated.versions).toHaveLength(2);
    });
  });

  describe("Supabase CRUD", () => {
    it("lists templates", async () => {
      const templates = await listTreatmentTemplates("doc-1", "clin-1");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("clinic_id", "clin-1");
      expect(templates).toHaveLength(2);
    });

    it("handles list errors gracefully", async () => {
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: "Offline" } });
      const templates = await listTreatmentTemplates("doc-1", "clin-1");
      expect(templates).toEqual([]);
    });

    it("saves new template", async () => {
      const saved = await saveTreatmentTemplate({ doctor_id: "doc-1", clinic_id: "clin-1", trigger: "t", title: "Title", treatment: "Body" });
      expect(mockInsert).toHaveBeenCalled();
      expect(saved?.id).toBe("1");
    });

    it("updates existing template", async () => {
      const existing = buildNextTemplate({ doctor_id: "doc-1", clinic_id: "clin-1", trigger: "t", title: "Title", treatment: "Body" });
      const saved = await saveTreatmentTemplate({ doctor_id: "doc-1", clinic_id: "clin-1", trigger: "t", title: "Title2", treatment: "Body" }, existing);
      expect(mockUpdate).toHaveBeenCalled();
      expect(saved?.id).toBe("1");
    });

    it("deletes template", async () => {
      mockEq.mockResolvedValueOnce({ error: null });
      await deleteTreatmentTemplate("doc-1", "clin-1", "temp-id");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "temp-id");
    });
  });

  describe("localStorage migration", () => {
    it("migrates data and removes key", async () => {
      const fakeStorage = {
        getItem: vi.fn().mockReturnValue('[{"id":"old-1"}]'),
        removeItem: vi.fn(),
      };
      vi.stubGlobal("window", { localStorage: fakeStorage });

      await migrateLegacyLocalStorageTemplates("doc", "clin");
      expect(fakeStorage.getItem).toHaveBeenCalledWith("hce:treatment_templates:doc:clin");
      expect(mockUpsert).toHaveBeenCalledWith([{ id: "old-1" }], { onConflict: "id" });
      expect(fakeStorage.removeItem).toHaveBeenCalled();
    });

    it("handles corrupt localStorage", async () => {
      const fakeStorage = {
        getItem: vi.fn().mockReturnValue('invalid json'),
        removeItem: vi.fn(),
      };
      vi.stubGlobal("window", { localStorage: fakeStorage });

      await migrateLegacyLocalStorageTemplates("doc", "clin");
      expect(fakeStorage.removeItem).toHaveBeenCalled();
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });
});
