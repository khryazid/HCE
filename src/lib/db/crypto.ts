/**
 * lib/db/crypto.ts
 *
 * Cifrado AES-GCM-256 para datos PHI almacenados en IndexedDB (offline).
 *
 * ⚠️  R-05 — RIESGO DE DISEÑO: Clave maestra compartida
 * ─────────────────────────────────────────────────────────────
 * NEXT_PUBLIC_IDB_MASTER_KEY es la misma clave para TODOS los usuarios del
 * despliegue. Si se compromete o rota:
 *
 *   - Todos los usuarios pierden acceso a sus datos IndexedDB cifrados.
 *   - No hay mecanismo de re-encriptación automática.
 *
 * Estrategia recomendada para rotación:
 *   1. Agregar NEXT_PUBLIC_IDB_MASTER_KEY_PREV con la clave anterior.
 *   2. En decryptData: intentar con la clave nueva, si falla, intentar con la anterior.
 *   3. En encryptData: usar siempre la clave nueva.
 *   4. Tras 1 ciclo de sync, eliminar NEXT_PUBLIC_IDB_MASTER_KEY_PREV.
 *
 * Alternativa superior (largo plazo): derivar la clave desde el JWT del usuario
 * en lugar de una variable de entorno compartida — así cada usuario tiene su
 * propia clave y la rotación no afecta a otros.
 * ─────────────────────────────────────────────────────────────
 */

export async function deriveKey(userId: string): Promise<CryptoKey> {
  let masterKey = process.env.NEXT_PUBLIC_IDB_MASTER_KEY;
  // Sync-2.5: Warn loudly if the master key is missing, but do NOT throw.
  // Throwing here blocks the entire app bootstrap and prevents login.
  // The fallback is the same key that was used before — existing encrypted
  // IndexedDB data was encrypted with this value and MUST be decryptable.
  if (!masterKey) {
    console.warn(
      "[IDB Crypto] NEXT_PUBLIC_IDB_MASTER_KEY is not set. " +
      "Using legacy fallback. Set the env var in Vercel to use a secure key.",
    );
    masterKey = "glyph_hce_fallback_master_key_2026";
  }
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterKey),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(userId),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(key: CryptoKey, data: unknown): Promise<string> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = enc.encode(JSON.stringify(data));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedData
  );

  const ivAndCiphertext = new Uint8Array(iv.length + ciphertext.byteLength);
  ivAndCiphertext.set(iv, 0);
  ivAndCiphertext.set(new Uint8Array(ciphertext), iv.length);

  return btoa(String.fromCharCode(...ivAndCiphertext));
}

export async function decryptData(key: CryptoKey, ciphertext: string): Promise<unknown> {
  const binaryString = atob(ciphertext);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const iv = bytes.slice(0, 12);
  const data = bytes.slice(12);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const dec = new TextDecoder();
  return JSON.parse(dec.decode(decrypted));
}
