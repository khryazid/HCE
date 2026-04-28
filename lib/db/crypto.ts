import { openDB } from "idb";

/**
 * THREAT MODEL — Custodia de clave PHI (AES-GCM 256)
 * ─────────────────────────────────────────────────────────────────────────────
 * La clave de cifrado se almacena como material base64 crudo en una base de
 * datos IndexedDB separada (`hce-security-db`). Esto implica:
 *
 * RIESGO ACEPTADO:
 *   Un atacante con acceso físico al perfil del navegador (sistema de archivos
 *   local) puede extraer el `key_material` y descifrar los datos PHI en IDB.
 *
 * MITIGACIONES ACTUALES:
 *   • La clave NO se envía a ningún servidor externo (localStorage, Supabase).
 *   • Está en una base IDB separada del resto de datos clínicos.
 *   • La clave se importa como `extractable: false` para uso en memoria,
 *     impidiendo su exportación desde el contexto de ejecución JS normal.
 *   • El backup manual requiere acción explícita del usuario.
 *
 * MITIGACIONES PENDIENTES (next cycle):
 *   • Añadir confirmación de sesión activa antes de exportar backup.
 */

const SECURITY_DB_NAME = "hce-security-db";
const SECURITY_DB_VERSION = 1;
const SECURITY_STORE = "crypto_keys";
const SECURITY_KEY_ID = "db-aes-gcm-key";

/** Caché en memoria para evitar accesos repetidos a IDB durante la sesión. */
let _keyCache: CryptoKey | null = null;

const _nodeStorage = new Map<string, string>();
function getStorage() {
  if (typeof localStorage !== "undefined") {
    return localStorage;
  }
  return {
    getItem: (key: string) => _nodeStorage.get(key) || null,
    setItem: (key: string, val: string) => _nodeStorage.set(key, val),
  };
}

async function getDeviceKek(): Promise<CryptoKey> {
  const storage = getStorage();
  let deviceId = storage.getItem("hce_device_kek_id");
  if (!deviceId) {
    deviceId = typeof crypto.randomUUID === "function" 
      ? crypto.randomUUID() 
      : Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
    storage.setItem("hce_device_kek_id", deviceId);
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(deviceId),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode("hce_secure_kek_salt_v1"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-KW", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  );
}

export type EncryptedEnvelope = {
  __encrypted: true;
  iv: string;
  ciphertext: string;
};

type SecurityKeyRecord = {
  id: string;
  key_material: string;
  created_at: string;
  is_wrapped?: boolean;
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

function toStrictArrayBuffer(bytes: Uint8Array) {
  return Uint8Array.from(bytes).buffer;
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
  if (_keyCache) return _keyCache;

  const db = await getSecurityDb();
  const stored = (await db.get(SECURITY_STORE, SECURITY_KEY_ID)) as SecurityKeyRecord | undefined;

  if (stored) {
    if (stored.is_wrapped) {
      const kek = await getDeviceKek();
      const wrappedKeyBuffer = toStrictArrayBuffer(fromBase64(stored.key_material));
      const unwrapped = await crypto.subtle.unwrapKey(
        "raw",
        wrappedKeyBuffer,
        kek,
        "AES-KW",
        "AES-GCM",
        false, // no extraíble en memoria
        ["encrypt", "decrypt"]
      );
      _keyCache = unwrapped;
      return unwrapped;
    } else {
      // MIGRATION: Clave legacy en crudo
      const rawKeyBytes = fromBase64(stored.key_material);
      const key = await crypto.subtle.importKey(
        "raw",
        toStrictArrayBuffer(rawKeyBytes),
        "AES-GCM",
        true, // Extraíble temporalmente para envolverla
        ["encrypt", "decrypt"]
      );
      
      const kek = await getDeviceKek();
      const wrappedBuffer = await crypto.subtle.wrapKey("raw", key, kek, "AES-KW");
      await db.put(SECURITY_STORE, {
        ...stored,
        key_material: toBase64(new Uint8Array(wrappedBuffer)),
        is_wrapped: true
      });
      
      const sessionKey = await crypto.subtle.unwrapKey(
        "raw",
        wrappedBuffer,
        kek,
        "AES-KW",
        "AES-GCM",
        false, // Mantenemos la versión en memoria como no extraíble
        ["encrypt", "decrypt"]
      );
      _keyCache = sessionKey;
      return sessionKey;
    }
  }

  const generated = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );

  const kek = await getDeviceKek();
  const wrappedBuffer = await crypto.subtle.wrapKey("raw", generated, kek, "AES-KW");

  const record: SecurityKeyRecord = {
    id: SECURITY_KEY_ID,
    key_material: toBase64(new Uint8Array(wrappedBuffer)),
    created_at: new Date().toISOString(),
    is_wrapped: true,
  };

  await db.put(SECURITY_STORE, record);

  const sessionKey = await crypto.subtle.unwrapKey(
    "raw",
    wrappedBuffer,
    kek,
    "AES-KW",
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
  _keyCache = sessionKey;
  return sessionKey;
}

/**
 * Descarta la clave en memoria. Llamar en logout para que la siguiente
 * sesión cargue la clave de IDB de nuevo (evita retención cross-session).
 */
export function clearEncryptionKey() {
  _keyCache = null;
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

  let rawKeyBase64: string;
  if (stored.is_wrapped) {
    const kek = await getDeviceKek();
    const wrappedKeyBuffer = toStrictArrayBuffer(fromBase64(stored.key_material));
    const tempExtractable = await crypto.subtle.unwrapKey(
      "raw",
      wrappedKeyBuffer,
      kek,
      "AES-KW",
      "AES-GCM",
      true, // Debe ser extraíble para generar el backup en crudo
      ["encrypt", "decrypt"]
    );
    const rawBuffer = await crypto.subtle.exportKey("raw", tempExtractable);
    rawKeyBase64 = toBase64(new Uint8Array(rawBuffer));
  } else {
    rawKeyBase64 = stored.key_material;
  }

  return {
    version: 1,
    key_material: rawKeyBase64,
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

  let tempKey: CryptoKey;
  try {
    tempKey = await crypto.subtle.importKey(
      "raw",
      toStrictArrayBuffer(rawKey),
      "AES-GCM",
      true, // Extraíble temporalmente para envolverla
      ["encrypt", "decrypt"],
    );
  } catch {
    throw new Error("La clave del backup no es compatible con AES-GCM.");
  }

  const kek = await getDeviceKek();
  const wrappedBuffer = await crypto.subtle.wrapKey("raw", tempKey, kek, "AES-KW");

  const db = await getSecurityDb();
  await db.put(SECURITY_STORE, {
    id: SECURITY_KEY_ID,
    key_material: toBase64(new Uint8Array(wrappedBuffer)),
    created_at:
      typeof payload.created_at === "string" && payload.created_at.trim()
        ? payload.created_at.trim()
        : new Date().toISOString(),
    is_wrapped: true,
  } satisfies SecurityKeyRecord);
  
  clearEncryptionKey(); // Forzar recarga en la siguiente operación
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
