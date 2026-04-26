import { openDB } from "idb";

const SECURITY_DB_NAME = "hce-security-db";
const SECURITY_DB_VERSION = 1;
const SECURITY_STORE = "crypto_keys";
const SECURITY_KEY_ID = "db-aes-gcm-key";

export type EncryptedEnvelope = {
  __encrypted: true;
  iv: string;
  ciphertext: string;
};

type SecurityKeyRecord = {
  id: string;
  key_material: string;
  created_at: string;
};

export type EncryptionKeyBackup = {
  version: 1;
  key_material: string;
  created_at: string;
  exported_at: string;
};

function toBase64(bytes: Uint8Array) {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }

  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as EncryptedEnvelope).__encrypted === true &&
      typeof (value as EncryptedEnvelope).iv === "string" &&
      typeof (value as EncryptedEnvelope).ciphertext === "string",
  );
}

async function getSecurityDb() {
  return openDB(SECURITY_DB_NAME, SECURITY_DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SECURITY_STORE)) {
        db.createObjectStore(SECURITY_STORE, { keyPath: "id" });
      }
    },
  });
}

async function loadOrCreateAesKey() {
  const db = await getSecurityDb();
  const stored = (await db.get(SECURITY_STORE, SECURITY_KEY_ID)) as SecurityKeyRecord | undefined;

  if (stored) {
    const rawKey = fromBase64(stored.key_material);
    return crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt", "decrypt"]);
  }

  const generated = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );

  const rawKey = new Uint8Array(await crypto.subtle.exportKey("raw", generated));
  const record: SecurityKeyRecord = {
    id: SECURITY_KEY_ID,
    key_material: toBase64(rawKey),
    created_at: new Date().toISOString(),
  };

  await db.put(SECURITY_STORE, record);
  return generated;
}

export async function exportEncryptionKeyBackup(): Promise<EncryptionKeyBackup> {
  const db = await getSecurityDb();

  let stored = (await db.get(SECURITY_STORE, SECURITY_KEY_ID)) as SecurityKeyRecord | undefined;

  if (!stored) {
    await loadOrCreateAesKey();
    stored = (await db.get(SECURITY_STORE, SECURITY_KEY_ID)) as SecurityKeyRecord | undefined;
  }

  if (!stored) {
    throw new Error("No se pudo preparar la clave de cifrado para exportar.");
  }

  return {
    version: 1,
    key_material: stored.key_material,
    created_at: stored.created_at,
    exported_at: new Date().toISOString(),
  };
}

export async function importEncryptionKeyBackup(backup: unknown) {
  if (!backup || typeof backup !== "object") {
    throw new Error("Formato de backup invalido.");
  }

  const payload = backup as Partial<EncryptionKeyBackup>;

  if (
    payload.version !== 1 ||
    typeof payload.key_material !== "string" ||
    !payload.key_material.trim()
  ) {
    throw new Error("El backup no contiene una clave valida.");
  }

  let rawKey: Uint8Array;
  try {
    rawKey = fromBase64(payload.key_material.trim());
  } catch {
    throw new Error("No se pudo decodificar la clave del backup.");
  }

  try {
    await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt", "decrypt"]);
  } catch {
    throw new Error("La clave del backup no es compatible con AES-GCM.");
  }

  const db = await getSecurityDb();
  await db.put(SECURITY_STORE, {
    id: SECURITY_KEY_ID,
    key_material: payload.key_material.trim(),
    created_at:
      typeof payload.created_at === "string" && payload.created_at.trim()
        ? payload.created_at.trim()
        : new Date().toISOString(),
  } satisfies SecurityKeyRecord);
}

export async function encryptJson<T>(value: T): Promise<EncryptedEnvelope> {
  const key = await loadOrCreateAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(value));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);

  return {
    __encrypted: true,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptJson<T>(value: unknown): Promise<T> {
  if (!isEncryptedEnvelope(value)) {
    return value as T;
  }

  const key = await loadOrCreateAesKey();
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(value.iv),
    },
    key,
    fromBase64(value.ciphertext),
  );

  return JSON.parse(new TextDecoder().decode(decrypted)) as T;
}

export { isEncryptedEnvelope };
