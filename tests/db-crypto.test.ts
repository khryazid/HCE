import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearOfflineDataForTests,
  enqueueSyncItem,
  getSyncQueueItemsByStatus,
  listPatientsByTenant,
  savePatientLocal,
} from "../lib/db/indexeddb";
import { decryptJson, encryptJson } from "../lib/db/crypto";
import type { PatientRecord } from "../types/patient";

const tenant = {
  doctorId: "doctor-1",
  clinicId: "clinic-1",
};

afterEach(async () => {
  await clearOfflineDataForTests();
});

describe("crypto envelope", () => {
  it("encrypts and decrypts JSON values", async () => {
    const source = {
      foo: "bar",
      nested: { count: 3 },
    };

    const encrypted = await encryptJson(source);
    const decrypted = await decryptJson<typeof source>(encrypted);

    expect(decrypted).toEqual(source);
  });
});

describe("offline patient storage", () => {
  it("stores and restores patients in encrypted form", async () => {
    const patient: PatientRecord = {
      id: "patient-1",
      clinic_id: tenant.clinicId,
      doctor_id: tenant.doctorId,
      document_number: "0102030405",
      full_name: "Paciente Prueba",
      birth_date: "1990-01-01",
      created_at: "2026-04-16T00:00:00.000Z",
      updated_at: "2026-04-16T00:00:00.000Z",
    };

    await savePatientLocal(patient);

    const restored = await listPatientsByTenant(tenant.doctorId, tenant.clinicId);

    expect(restored).toHaveLength(1);
    expect(restored[0]).toEqual(patient);
  });

  it("stores sync queue payloads encrypted and returns hydrated payloads", async () => {
    await enqueueSyncItem({
      id: "sync-1",
      table_name: "patients",
      record_id: "patient-1",
      action: "insert",
      payload: {
        id: "patient-1",
        clinic_id: tenant.clinicId,
        doctor_id: tenant.doctorId,
        full_name: "Paciente Prueba",
      },
      doctor_id: tenant.doctorId,
      clinic_id: tenant.clinicId,
      client_timestamp: Date.now(),
      status: "pending",
      retry_count: 0,
    });

    const items = await getSyncQueueItemsByStatus(["pending"]);

    expect(items).toHaveLength(1);
    expect(items[0].payload).toMatchObject({
      id: "patient-1",
      clinic_id: tenant.clinicId,
      doctor_id: tenant.doctorId,
      full_name: "Paciente Prueba",
    });
  });
});
