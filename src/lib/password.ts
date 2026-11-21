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

  // Use crypto.getRandomValues
  const getRandomChar = (charset: string): string => {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    return charset[array[0] % charset.length];
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

  // Combine and shuffle using Fisher-Yates
  const combined = [...requiredChars, ...remainingChars];
  for (let i = combined.length - 1; i > 0; i--) {
    const array = new Uint32Array(1);
    globalThis.crypto.getRandomValues(array);
    const j = array[0] % (i + 1);
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join("");
}
