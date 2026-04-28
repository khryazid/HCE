import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncQueueItem } from "@/types/sync";

const {
  mockGetSyncQueueItemsByStatus,
  mockUpdateSyncItemStatus,
  mockDeleteSyncQueueItem,
  mockGetOfflineDb,
  mockMaybeSingle,
  mockSingle,
  mockDeleteEq,
  mockUpsert,
  mockGetSession,
  mockEncryptJson,
  mockDecryptJson,
} = vi.hoisted(() => ({
  mockGetSyncQueueItemsByStatus: vi.fn(),
  mockUpdateSyncItemStatus: vi.fn(),
  mockDeleteSyncQueueItem: vi.fn(),
  mockGetOfflineDb: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockSingle: vi.fn(),
  mockDeleteEq: vi.fn(),
  mockUpsert: vi.fn(),
  mockGetSession: vi.fn(),
  mockEncryptJson: vi.fn(),
  mockDecryptJson: vi.fn(),
}));

vi.mock("@/lib/db/indexeddb", () => ({
  getSyncQueueItemsByStatus: mockGetSyncQueueItemsByStatus,
  updateSyncItemStatus: mockUpdateSyncItemStatus,
  deleteSyncQueueItem: mockDeleteSyncQueueItem,
  getOfflineDb: mockGetOfflineDb,
}));

vi.mock("@/lib/db/crypto", () => ({
  encryptJson: mockEncryptJson,
  decryptJson: mockDecryptJson,
}));

vi.mock("@/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    auth: {
      getSession: mockGetSession,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
          // Second .eq() chained for the duplicate-patient lookup
          eq: () => ({
            maybeSingle: mockMaybeSingle,
          }),
        }),
      }),
      delete: () => ({
        eq: mockDeleteEq,
      }),
      upsert: mockUpsert,
    }),
  }),
}));

import { flushSyncQueue } from "@/lib/sync/sync-worker";

function buildSyncItem(retryCount: number): SyncQueueItem {
  return {
    id: "sync-1",
    table_name: "patients",
    record_id: "patient-1",
    action: "insert",
    payload: {
      full_name: "Paciente Prueba",
      status: "activo",
    },
    doctor_id: "doctor-1",
    clinic_id: "clinic-1",
    client_timestamp: Date.now(),
    status: "pending",
    retry_count: retryCount,
  };
}

function buildMergeSyncItem() {
  return {
    ...buildSyncItem(0),
    id: "sync-merge",
    payload: {
      full_name: "Paciente Duplicado",
      document_number: "1717171717",
      birth_date: "1990-01-01",
      status: "activo",
      created_at: "2026-04-26T10:00:00.000Z",
      updated_at: "2026-04-26T10:05:00.000Z",
    },
  } satisfies SyncQueueItem;
}

describe("sync worker retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: {
            id: "doctor-1",
          },
        },
      },
    });

    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    mockDeleteEq.mockResolvedValue({
      error: null,
    });

    mockUpsert.mockResolvedValue({
      error: {
        message: "network timeout",
      },
    });

    mockSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    mockEncryptJson.mockImplementation(async (value) => ({
      __encrypted: true,
      iv: "iv",
      ciphertext: JSON.stringify(value),
    }));

    mockDecryptJson.mockImplementation(async (value) => value as unknown);

    mockGetOfflineDb.mockResolvedValue({
      getAll: vi.fn(async (store: string) => {
        if (store === "sync_queue") {
          return [
            {
              id: "sync-clinical",
              table_name: "clinical_records",
              record_id: "record-1",
              action: "insert",
              payload: {
                patient_id: "patient-1",
                chief_complaint: "Dolor",
              },
              doctor_id: "doctor-1",
              clinic_id: "clinic-1",
              client_timestamp: Date.now(),
              status: "pending",
              retry_count: 0,
            },
          ];
        }

        if (store === "clinical_records") {
          return [
            {
              id: "record-1",
              patient_id: "patient-1",
            },
          ];
        }

        return [];
      }),
      getAllFromIndex: vi.fn(async (store: string, index: string, key: string) => {
        if (store === "clinical_records" && index === "by_patient") {
          return [
            {
              id: "record-1",
              patient_id: "patient-1",
            },
          ].filter((r) => r.patient_id === key);
        }
        return [];
      }),
      put: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
    });
  });

  it("increments retry_count when rescheduling pending sync", async () => {
    mockGetSyncQueueItemsByStatus.mockResolvedValue([buildSyncItem(0)]);

    await flushSyncQueue();

    expect(mockUpdateSyncItemStatus).toHaveBeenNthCalledWith(1, "sync-1", "syncing");
    expect(mockUpdateSyncItemStatus).toHaveBeenNthCalledWith(
      2,
      "sync-1",
      "pending",
      "network timeout",
      1,
      expect.any(Number),
    );
    expect(mockDeleteSyncQueueItem).not.toHaveBeenCalled();
  });

  it("marks abandoned when retry_count reaches max", async () => {
    mockGetSyncQueueItemsByStatus.mockResolvedValue([buildSyncItem(2)]);

    await flushSyncQueue();

    expect(mockUpdateSyncItemStatus).toHaveBeenNthCalledWith(1, "sync-1", "syncing");
    expect(mockUpdateSyncItemStatus).toHaveBeenNthCalledWith(
      2,
      "sync-1",
      "abandoned",
      "network timeout",
      3,
      expect.any(Number),
    );
    expect(mockDeleteSyncQueueItem).not.toHaveBeenCalled();
  });

  it("marks conflicted when queue item belongs to another doctor", async () => {
    const foreignItem = {
      ...buildSyncItem(0),
      id: "sync-foreign",
      doctor_id: "doctor-otro",
    };

    mockGetSyncQueueItemsByStatus.mockResolvedValue([foreignItem]);

    await flushSyncQueue();

    expect(mockUpdateSyncItemStatus).toHaveBeenCalledWith(
      "sync-foreign",
      "conflicted",
      "El item pertenece a otro doctor/tenant. Descarta este item o inicia sesion con el usuario correcto.",
      0,
    );
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("includes patient status when syncing patient payload", async () => {
    const item = buildSyncItem(0);
    item.payload = {
      ...item.payload,
      document_number: "1717171717",
      birth_date: "1990-01-01",
      status: "alta",
      created_at: "2026-04-26T10:00:00.000Z",
      updated_at: "2026-04-26T10:05:00.000Z",
    };

    mockGetSyncQueueItemsByStatus.mockResolvedValue([item]);
    mockUpsert.mockResolvedValue({
      error: null,
    });

    await flushSyncQueue();

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "alta",
      }),
      { onConflict: "id" },
    );
    expect(mockDeleteSyncQueueItem).toHaveBeenCalledWith("sync-1");
  });

  it("merges duplicate patients and rewrites dependent records", async () => {
    const mergeItem = buildMergeSyncItem();

    mockGetSyncQueueItemsByStatus.mockResolvedValue([mergeItem]);
    mockUpsert.mockResolvedValue({
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });
    // First maybeSingle call: remote timestamp check in syncItem returns null (no remote record).
    // Second maybeSingle call: duplicate-patient lookup returns existing patient id.
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: "patient-merged" }, error: null });

    await flushSyncQueue();

    expect(mockDeleteSyncQueueItem).toHaveBeenCalledWith("sync-merge");
    expect(mockEncryptJson).toHaveBeenCalledWith(
      expect.objectContaining({
        patient_id: "patient-merged",
      }),
    );
    expect(mockUpdateSyncItemStatus).not.toHaveBeenCalledWith(
      "sync-merge",
      "failed",
      expect.any(String),
      expect.any(Number),
      expect.any(Number),
    );
    expect(mockDeleteEq).not.toHaveBeenCalled();
  });
});
