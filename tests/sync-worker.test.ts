import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncQueueItem } from "@/types/sync";

const {
  mockGetSyncQueueItemsByStatus,
  mockUpdateSyncItemStatus,
  mockDeleteSyncQueueItem,
  mockMaybeSingle,
  mockDeleteEq,
  mockUpsert,
  mockGetSession,
} = vi.hoisted(() => ({
  mockGetSyncQueueItemsByStatus: vi.fn(),
  mockUpdateSyncItemStatus: vi.fn(),
  mockDeleteSyncQueueItem: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockDeleteEq: vi.fn(),
  mockUpsert: vi.fn(),
  mockGetSession: vi.fn(),
}));

vi.mock("@/lib/db/indexeddb", () => ({
  getSyncQueueItemsByStatus: mockGetSyncQueueItemsByStatus,
  updateSyncItemStatus: mockUpdateSyncItemStatus,
  deleteSyncQueueItem: mockDeleteSyncQueueItem,
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
    },
    doctor_id: "doctor-1",
    clinic_id: "clinic-1",
    client_timestamp: Date.now(),
    status: "pending",
    retry_count: retryCount,
  };
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
    );
    expect(mockDeleteSyncQueueItem).not.toHaveBeenCalled();
  });

  it("marks failed when retry_count reaches max", async () => {
    mockGetSyncQueueItemsByStatus.mockResolvedValue([buildSyncItem(2)]);

    await flushSyncQueue();

    expect(mockUpdateSyncItemStatus).toHaveBeenNthCalledWith(1, "sync-1", "syncing");
    expect(mockUpdateSyncItemStatus).toHaveBeenNthCalledWith(
      2,
      "sync-1",
      "failed",
      "network timeout",
      3,
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
});
