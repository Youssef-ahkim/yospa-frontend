/**
 * Generates a cryptographically secure random password.
 * - Uses crypto.getRandomValues for high entropy
 * - Length is at least 16 characters (defaults to 16)
 * - Excludes visually ambiguous characters: 0, O, 1, l, I
 * - Ensures presence of uppercase, lowercase, numbers, and symbols
 */
export function generateSecurePassword(length: number = 16): string {
  const actualLength = Math.max(16, length);

  const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No I, O
  const LOWER = "abcdefghijkmnopqrstuvwxyz"; // No l
  const DIGITS = "23456789"; // No 0, 1
  const SYMBOLS = "!@#$%^&*-_+=";

  const ALL = UPPER + LOWER + DIGITS + SYMBOLS;

  // Use crypto.getRandomValues with rejection sampling to eliminate modulo bias
  const getRandomChar = (charset: string): string => {
    const n = charset.length;
    const maxMultiple = Math.floor(0x100000000 / n) * n;
    const array = new Uint32Array(1);
    while (true) {
      globalThis.crypto.getRandomValues(array);
      const val = array[0];
      if (val < maxMultiple) {
        return charset[val % n];
      }
    }
  };

  const getRandomIndex = (bound: number): number => {
    const maxMultiple = Math.floor(0x100000000 / bound) * bound;
    const array = new Uint32Array(1);
    while (true) {
      globalThis.crypto.getRandomValues(array);
      const val = array[0];
      if (val < maxMultiple) {
        return val % bound;
      }
    }
  };

  // Guarantee at least one of each required group
  const requiredChars = [
    getRandomChar(UPPER),
    getRandomChar(LOWER),
    getRandomChar(DIGITS),
    getRandomChar(SYMBOLS),
  ];

  // Fill the remainder from the full pool
  const remainingCount = actualLength - requiredChars.length;
  const remainingChars: string[] = [];
  for (let i = 0; i < remainingCount; i++) {
    remainingChars.push(getRandomChar(ALL));
  }

  // Combine and shuffle using Fisher-Yates with unbiased rejection sampling
  const combined = [...requiredChars, ...remainingChars];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = getRandomIndex(i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join("");
}
