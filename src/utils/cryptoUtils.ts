/**
 * Cryptographically Secure Random Utilities
 * Complies with CodeQL js/insecure-randomness security standards
 * Uses W3C Web Crypto API (crypto.getRandomValues) natively supported in all modern browsers and Node.js
 */

/**
 * Returns an unbiased cryptographically secure random integer between min and max (inclusive).
 * Uses power-of-2 bitmask rejection sampling to guarantee 100% uniform distribution with zero bias.
 * Free of modulo (%) or division (/) operations on cryptographic random numbers.
 * Complies with CWE-338 & CWE-327 and CodeQL js/biased-cryptographic-random.
 */
export function getSecureRandomInt(min: number, max: number): number {
  if (min >= max) return min;
  const range = max - min + 1;
  if (range > 0xffffffff) {
    throw new RangeError('[cryptoUtils] Range exceeds 32-bit unsigned integer limit');
  }

  // 1. In Node.js environment, use native crypto.randomInt (built-in unbiased CSPRNG)
  if (typeof window === 'undefined') {
    try {
      const nodeCrypto = require('crypto');
      if (typeof nodeCrypto.randomInt === 'function') {
        return nodeCrypto.randomInt(min, max + 1);
      }
    } catch {}
  }

  // 2. In browser (Web Crypto API): compute power-of-2 bitmask using Math.clz32
  // Unsigned 32-bit bitmask covering (range - 1) with zero loop, no overflow risk
  const mask = range <= 1 ? 0 : (0xffffffff >>> Math.clz32(range - 1));

  const array = new Uint32Array(1);
  while (true) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      const nodeCrypto = require('crypto');
      const buf = nodeCrypto.randomBytes(4);
      array[0] = buf.readUInt32LE(0);
    }

    const val = array[0] & mask;
    if (val < range) {
      return min + val;
    }
  }
}

/**
 * Returns a cryptographically secure alphanumeric random ID
 * Uses uniform power-of-2 bitmask rejection sampling over a 36-char alphabet.
 * Zero modulo bias, 100% uniform character distribution.
 * @param prefix Optional string prefix (e.g. 'qa_', 'scan_', 'cheer_')
 * @param length Length of the random suffix (default: 8)
 */
export function getSecureRandomId(prefix: string = '', length: number = 8): string {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  const mask = 63; // 2^6 - 1: smallest power-of-2 mask >= 36
  let result = '';
  const buf = new Uint8Array(Math.max(length * 2, 16));

  while (result.length < length) {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(buf);
    } else {
      const nodeCrypto = require('crypto');
      const nodeBuf = nodeCrypto.randomBytes(buf.length);
      for (let i = 0; i < buf.length; i++) buf[i] = nodeBuf[i];
    }
    for (let i = 0; i < buf.length && result.length < length; i++) {
      const val = buf[i] & mask;
      if (val < chars.length) {
        result += chars[val];
      }
    }
  }

  return prefix ? `${prefix}${result}` : result;
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
