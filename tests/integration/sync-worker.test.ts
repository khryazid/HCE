import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { flushSyncQueue } from '@/lib/sync/sync-worker';
import * as indexeddb from '@/lib/db/indexeddb';
import * as supabaseClient from '@/lib/supabase/client';
import { APP_EVENT_SYNC_ABANDONED } from '@/lib/observability/app-events';

vi.mock('@/lib/db/indexeddb');
vi.mock('@/lib/supabase/client');
vi.mock('@/lib/observability/app-events');
vi.mock('@/lib/observability/error-logger');

describe('Sync Worker Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe marcar un item como "conflicted" si hay clock-drift', async () => {
    const mockAuthUser = { id: 'doctor-123' };
    
    // Simular que el usuario está logueado
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            // El servidor tiene un updated_at en el futuro comparado con el client_timestamp
            maybeSingle: vi.fn().mockResolvedValue({ 
              data: { id: 'rec-1', updated_at: new Date(Date.now() + 10000).toISOString() }, 
              error: null 
            })
          })
        })
      })
    } as any);

    const pendingItem = {
      id: 'queue-1',
      table_name: 'clinical_records',
      record_id: 'rec-1',
      doctor_id: 'doctor-123',
      clinic_id: 'clinic-123',
      action: 'update',
      payload: { note: 'test' },
      client_timestamp: Date.now(),
      retry_count: 0
    };

    vi.mocked(indexeddb.getSyncQueueItemsByStatus).mockResolvedValue([pendingItem as any]);
    vi.mocked(indexeddb.updateSyncItemStatus).mockResolvedValue(undefined);
    vi.mocked(indexeddb.pruneOldSyncQueueItems).mockResolvedValue(0);

    const result = await flushSyncQueue({});

    expect(result?.conflicted).toBe(1);
    expect(indexeddb.updateSyncItemStatus).toHaveBeenCalledWith(
      'queue-1',
      'conflicted',
      expect.stringContaining('clock drift'),
      0
    );
  });

  it('debe abandonar el sync después de MAX_RETRIES (50 intentos)', async () => {
    const mockAuthUser = { id: 'doctor-123' };
    
    vi.mocked(supabaseClient.getSupabaseClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: mockAuthUser }, error: null }) },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        upsert: vi.fn().mockResolvedValue({ error: { message: 'Network error' } }) // Falla simulada
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }) // Para el telemetry audit
    } as any);

    const pendingItem = {
      id: 'queue-2',
      table_name: 'patients',
      record_id: 'pat-1',
      doctor_id: 'doctor-123',
      clinic_id: 'clinic-123',
      action: 'create',
      payload: { name: 'Test' },
      client_timestamp: Date.now(),
      retry_count: 49 // Último intento antes de abandonar
    };

    vi.mocked(indexeddb.getSyncQueueItemsByStatus).mockResolvedValue([pendingItem as any]);
    vi.mocked(indexeddb.updateSyncItemStatus).mockResolvedValue(undefined);
    vi.mocked(indexeddb.pruneOldSyncQueueItems).mockResolvedValue(0);

    const result = await flushSyncQueue({});

    expect(result?.failed).toBe(1);
    expect(indexeddb.updateSyncItemStatus).toHaveBeenCalledWith(
      'queue-2',
      'abandoned',
      'Network error',
      50, // retry_count incrementado
      expect.any(Number) // nextRetryAt
    );
  });
});
