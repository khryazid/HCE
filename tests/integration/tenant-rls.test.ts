import { describe, expect, it, beforeAll } from "vitest";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

describe("Tenant Isolation (RLS)", () => {
  let supabaseA: SupabaseClient;

  beforeAll(async () => {
    // Solo ejecutamos este test si tenemos variables reales de entorno apuntando a Supabase
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.E2E_EMAIL) {
      supabaseA = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Autenticar al Doctor A (E2E Test User)
      await supabaseA.auth.signInWithPassword({
        email: process.env.E2E_EMAIL,
        password: process.env.E2E_PASSWORD!,
      });
    }
  });

  it.skipIf(!process.env.E2E_EMAIL)(
    "Doctor A cannot access Doctor B's clinical records via API",
    async () => {
      // Intentamos leer explícitamente el registro de otro tenant
      // (Suponiendo que "doc-b-record-id" o un ID inválido pertenece a otro tenant)
      // Como no conocemos el ID exacto del Doctor B, hacemos una query general.
      // RLS debe asegurar que la data devuelta SOLO pertenezca al Doctor A.

      const { data, error } = await supabaseA.from("clinical_records").select("clinic_id");

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);

      // Si hay datos, validamos que todos tengan el mismo clinic_id (aislamiento)
      if (data && data.length > 0) {
        const uniqueClinicIds = new Set(data.map((record) => record.clinic_id));
        expect(uniqueClinicIds.size).toBeLessThanOrEqual(1);
      }
    }
  );

  it.skipIf(!process.env.E2E_EMAIL)(
    "Doctor A cannot insert a record associated with another clinic_id",
    async () => {
      // Intentar insertar un record en la clínica "dummy-clinic-b"
      const { error } = await supabaseA.from("clinical_records").insert({
        clinic_id: "00000000-0000-0000-0000-000000000000", // UUID falso
        patient_id: "00000000-0000-0000-0000-000000000000",
        doctor_id: "00000000-0000-0000-0000-000000000000",
        record_type: "consultation",
        status: "draft",
      });

      // RLS debe bloquear la inserción si el clinic_id no coincide con el del perfil del usuario
      expect(error).not.toBeNull();
      // Código de error de RLS de Postgres (new row violates row-level security policy)
      expect(error?.code).toBe("42501"); 
    }
  );
});
