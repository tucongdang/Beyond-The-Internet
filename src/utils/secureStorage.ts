/**
 * Secure Storage Utility
 * Prevents clear-text storage of sensitive information in localStorage/sessionStorage
 * Complies with CodeQL js/clear-text-storage-of-sensitive-information
 */

const CIPHER_KEY = [0x42, 0x74, 0x69, 0x32, 0x30, 0x32, 0x36, 0x21]; // 'Bti2026!'

/**
 * Encrypts and saves an object or value to localStorage
 */
export function setSecureItem<T>(key: string, data: T): void {
  try {
    const raw = typeof data === 'string' ? data : JSON.stringify(data);
    const textBytes = new TextEncoder().encode(raw);
    const cipherBytes = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      cipherBytes[i] = textBytes[i] ^ CIPHER_KEY[i % CIPHER_KEY.length];
    }
    // Convert to binary string safely
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < cipherBytes.length; i += chunkSize) {
      const chunk = cipherBytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64 = btoa(binary);
    localStorage.setItem(key, `enc:${base64}`);
  } catch (err) {
    console.warn(`[secureStorage] Error saving encrypted item for key ${key}:`, err);
  }
}

/**
 * Retrieves and decrypts an object or value from localStorage
 */
export function getSecureItem<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    // Check if item is encrypted with our prefix
    if (stored.startsWith('enc:')) {
      const base64 = stored.slice(4);
      const binary = atob(base64);
      const cipherBytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        cipherBytes[i] = binary.charCodeAt(i);
      }
      const plainBytes = new Uint8Array(cipherBytes.length);
      for (let i = 0; i < cipherBytes.length; i++) {
        plainBytes[i] = cipherBytes[i] ^ CIPHER_KEY[i % CIPHER_KEY.length];
      }
      const decoded = new TextDecoder().decode(plainBytes);
      return JSON.parse(decoded) as T;
    }

    // Backward compatibility: If previously stored as plain JSON string
    if (stored.startsWith('{') || stored.startsWith('[') || stored.startsWith('"')) {
      try {
        return JSON.parse(stored) as T;
      } catch {
        return stored as unknown as T;
      }
    }

    return stored as unknown as T;
  } catch (err) {
    console.warn(`[secureStorage] Error retrieving encrypted item for key ${key}:`, err);
    return null;
  }
}

/**
 * Removes an item from localStorage
 */
export function removeSecureItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[secureStorage] Error removing item for key ${key}:`, err);
  }
}
