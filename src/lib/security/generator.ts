/**
 * Cryptographically secure password & passphrase generator.
 * Always uses crypto.getRandomValues() — never Math.random().
 */

export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous?: boolean; // e.g. 0, O, l, 1, I
}

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const UPPERCASE_ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const LOWERCASE_ALL = 'abcdefghijklmnopqrstuvwxyz';
const NUMBERS = '23456789';
const NUMBERS_ALL = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

const WORDS_LIST = [
  'apple', 'banana', 'cherry', 'diamond', 'eagle', 'forest', 'galaxy', 'harbor',
  'island', 'jungle', 'knight', 'legend', 'mountain', 'nebula', 'ocean', 'planet',
  'quantum', 'river', 'shadow', 'thunder', 'universe', 'voyage', 'whisper', 'zenith',
  'beacon', 'crystal', 'dragon', 'falcon', 'glacier', 'horizon', 'matrix', 'phoenix'
];

/**
 * Generates a random secure password using crypto.getRandomValues.
 */
export function generateSecurePassword(
  options: PasswordGeneratorOptions = {
    length: 18,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeAmbiguous: false,
  }
): string {
  let charPool = '';
  const requiredChars: string[] = [];

  const upper = options.excludeAmbiguous ? UPPERCASE : UPPERCASE_ALL;
  const lower = options.excludeAmbiguous ? LOWERCASE : LOWERCASE_ALL;
  const nums = options.excludeAmbiguous ? NUMBERS : NUMBERS_ALL;
  const syms = SYMBOLS;

  if (options.includeUppercase) {
    charPool += upper;
    requiredChars.push(getRandomChar(upper));
  }
  if (options.includeLowercase) {
    charPool += lower;
    requiredChars.push(getRandomChar(lower));
  }
  if (options.includeNumbers) {
    charPool += nums;
    requiredChars.push(getRandomChar(nums));
  }
  if (options.includeSymbols) {
    charPool += syms;
    requiredChars.push(getRandomChar(syms));
  }

  if (!charPool) {
    charPool = lower;
  }

  const remainingLength = Math.max(0, options.length - requiredChars.length);
  const randomBytes = new Uint32Array(remainingLength);
  crypto.getRandomValues(randomBytes);

  const resultChars: string[] = [...requiredChars];
  for (let i = 0; i < remainingLength; i++) {
    const randomIndex = randomBytes[i] % charPool.length;
    resultChars.push(charPool[randomIndex]);
  }

  // Cryptographic shuffle of the result array (Fisher-Yates)
  const shuffleBytes = new Uint32Array(resultChars.length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = resultChars.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [resultChars[i], resultChars[j]] = [resultChars[j], resultChars[i]];
  }

  return resultChars.join('');
}

/**
 * Generates a multi-word passphrase with separators and numbers (e.g. "crystal-thunder-galaxy-74").
 */
export function generatePassphrase(wordCount = 4, separator = '-'): string {
  const words: string[] = [];
  const randomBytes = new Uint32Array(wordCount);
  crypto.getRandomValues(randomBytes);

  for (let i = 0; i < wordCount; i++) {
    const index = randomBytes[i] % WORDS_LIST.length;
    words.push(WORDS_LIST[index]);
  }

  const numBytes = new Uint32Array(1);
  crypto.getRandomValues(numBytes);
  const randomNum = (numBytes[0] % 90) + 10; // 10 to 99

  return `${words.join(separator)}${separator}${randomNum}`;
}

/**
 * Calculates a quick visual entropy score (0 to 100) for a password.
 */
export function estimatePasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: 'Vacía', color: 'bg-gray-500' };

  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 14) score += 25;
  if (password.length >= 20) score += 15;

  if (/[A-Z]/.test(password)) score += 10;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 10;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;

  if (score < 40) return { score, label: 'Débil', color: 'bg-red-500' };
  if (score < 70) return { score, label: 'Media', color: 'bg-yellow-500' };
  if (score < 90) return { score, label: 'Fuerte', color: 'bg-emerald-500' };
  return { score: 100, label: 'Excelente', color: 'bg-cyan-500' };
}

function getRandomChar(str: string): string {
  const byte = new Uint32Array(1);
  crypto.getRandomValues(byte);
  return str[byte[0] % str.length];
}
