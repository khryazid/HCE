export async function deriveKey(userId: string): Promise<CryptoKey> {
  const masterKey = process.env.NEXT_PUBLIC_IDB_MASTER_KEY || "glyph_hce_fallback_master_key_2026";
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
