/**
 * Client-Side Encrypted Data Storage using Web Crypto API (AES-GCM 256-bit)
 * Ensures sensitive user information is encrypted before persisting to Firestore.
 */

// Master salt for application cryptographic namespace
const APP_SALT = new TextEncoder().encode('K-store KH_Encrypted_Data_Store_2026');

async function deriveKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: APP_SALT,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-GCM 256.
 * Returns a base64 encoded string containing IV + Ciphertext.
 */
export async function encryptSensitiveData(plainText: string, userKey: string): Promise<string> {
  if (!plainText) return '';
  try {
    const key = await deriveKey(userKey);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plainText);

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine IV (12 bytes) and ciphertext
    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuffer), iv.length);

    // Convert to base64
    let binary = '';
    for (let i = 0; i < combined.byteLength; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return btoa(binary);
  } catch (err) {
    console.error('Encryption failed:', err);
    throw new Error('Data encryption failed: unable to process sensitive input.');
  }
}

/**
 * Decrypts a base64 encoded IV + AES-GCM ciphertext.
 */
export async function decryptSensitiveData(encryptedBase64: string, userKey: string): Promise<string> {
  if (!encryptedBase64) return '';
  try {
    const binary = atob(encryptedBase64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.slice(0, 12);
    const cipherBytes = combined.slice(12);
    const key = await deriveKey(userKey);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherBytes
    );

    return new TextDecoder().decode(decryptedBuffer);
  } catch (err) {
    console.error('Decryption failed:', err);
    throw new Error('Decryption failed: invalid key or corrupted ciphertext.');
  }
}
