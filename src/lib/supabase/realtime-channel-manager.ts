/**
 * realtime-channel-manager.ts — Sync-3.4
 *
 * Singleton para reutilizar canales de Supabase Realtime.
 *
 * PROBLEMA que resuelve:
 *   Cada hook (usePatientsRealtime, useAgendaRealtime, etc.) crea su propio
 *   canal en el mount y lo destruye en el unmount. Si el componente remonta
 *   (HMR, navegación rápida, Strict Mode doble-mount) se crean canales
 *   duplicados que consumen el límite de conexiones concurrentes de Supabase
 *   (200 por proyecto en el plan gratuito).
 *
 * SOLUCIÓN:
 *   Un Map<channelKey, { channel, refCount }>. Al solicitar un canal con la
 *   misma key se devuelve el existente incrementando su refCount. Al hacer
 *   release() solo se destruye cuando refCount llega a 0.
 *
 * USO:
 *   const ch = realtimeChannelManager.acquire(supabase, 'patients:clinic:uuid', setup);
 *   // en cleanup:
 *   realtimeChannelManager.release('patients:clinic:uuid');
 */

import { getSupabaseClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ChannelEntry = {
  channel: RealtimeChannel;
  refCount: number;
};

type ChannelSetupFn = (channel: RealtimeChannel) => RealtimeChannel;

class RealtimeChannelManager {
  private readonly channels = new Map<string, ChannelEntry>();

  /**
   * Obtiene (o crea) un canal para la key dada.
   * Si el canal ya existe, incrementa el refCount y lo devuelve.
   * Si no existe, llama a setupFn(channel) para registrar los .on() listeners
   * y luego llama a .subscribe().
   *
   * @param key       - Identificador único del canal (ej. "patients:clinic:abc")
   * @param setupFn   - Función que recibe el canal crudo y registra listeners.
   *                    Debe devolver el canal (con el patrón fluent de Supabase).
   */
  acquire(key: string, setupFn: ChannelSetupFn): RealtimeChannel {
    const existing = this.channels.get(key);

    if (existing) {
      existing.refCount += 1;
      return existing.channel;
    }

    const supabase = getSupabaseClient();
    const rawChannel = supabase.channel(key);
    const configuredChannel = setupFn(rawChannel);
    configuredChannel.subscribe();

    this.channels.set(key, { channel: configuredChannel, refCount: 1 });
    return configuredChannel;
  }

  /**
   * Libera una referencia al canal. Cuando refCount llega a 0 el canal se
   * destruye (unsubscribe + removeChannel). Seguro de llamar múltiples veces.
   */
  release(key: string): void {
    const entry = this.channels.get(key);
    if (!entry) return;

    entry.refCount -= 1;

    if (entry.refCount <= 0) {
      const supabase = getSupabaseClient();
      supabase.removeChannel(entry.channel);
      this.channels.delete(key);
    }
  }

  /** Destruye todos los canales activos. Llamar en logout. */
  releaseAll(): void {
    const supabase = getSupabaseClient();
    for (const [key, entry] of this.channels) {
      supabase.removeChannel(entry.channel);
      this.channels.delete(key);
    }
  }

  /** Número de canales activos (útil para debugging). */
  get activeChannelCount(): number {
    return this.channels.size;
  }
}

/** Instancia singleton — importar desde cualquier hook de Realtime. */
export const realtimeChannelManager = new RealtimeChannelManager();
