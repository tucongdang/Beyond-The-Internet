/**
 * Cryptographically Secure Random Utilities
 * Complies with CodeQL js/insecure-randomness security standards
 * Uses W3C Web Crypto API (crypto.getRandomValues) natively supported in all modern browsers and Node.js
 */

/**
 * Returns a cryptographically secure random integer between min and max (inclusive)
 */
export function getSecureRandomInt(min: number, max: number): number {
  if (min >= max) return min;
  const range = max - min + 1;
  const array = new Uint32Array(1);

  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Standard Node.js crypto fallback
    const nodeCrypto = require('crypto');
    const buf = nodeCrypto.randomBytes(4);
    array[0] = buf.readUInt32LE(0);
  }

  return min + (array[0] % range);
}

/**
 * Returns a cryptographically secure alphanumeric random ID
 * @param prefix Optional string prefix (e.g. 'qa_', 'scan_', 'cheer_')
 * @param length Length of the random suffix (default: 8)
 */
export function getSecureRandomId(prefix: string = '', length: number = 8): string {
  const bytes = new Uint8Array(Math.max(length, 4));
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    const nodeCrypto = require('crypto');
    const buf = nodeCrypto.randomBytes(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = buf[i];
    }
  }

  // Convert bytes to base36 alphanumeric characters
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += bytes[i].toString(36);
  }
  const suffix = str.substring(0, length);
  return prefix ? `${prefix}${suffix}` : suffix;
}

/**
 * Picks a random item from an array using cryptographically secure random selection
 * Ideal for Lucky Draw, quizzes, and raffles
 */
export function getSecureRandomItem<T>(items: T[]): T {
  if (!items || items.length === 0) {
    throw new Error('[cryptoUtils] Cannot pick random item from empty array');
  }
  const idx = getSecureRandomInt(0, items.length - 1);
  return items[idx];
}

/**
 * Cryptographically secure array shuffle (Fisher-Yates)
 */
export function secureShuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = getSecureRandomInt(0, i);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

/**
 * Generates a random string using a specific character set (e.g. for digit masks or lucky draw animations)
 */
export function getSecureRandomChars(length: number, charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'): string {
  if (!charset || charset.length === 0) return '';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(getSecureRandomInt(0, charset.length - 1));
  }
  return result;
}
