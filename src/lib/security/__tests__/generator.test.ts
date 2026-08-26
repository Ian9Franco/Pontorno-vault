import { describe, it, expect } from 'vitest';
import {
  generateSecurePassword,
  generatePassphrase,
  estimatePasswordStrength,
} from '../generator';

describe('Password Generator & Security Utilities', () => {
  it('should generate passwords of requested length', () => {
    const pwd1 = generateSecurePassword({ length: 16, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true });
    const pwd2 = generateSecurePassword({ length: 32, includeUppercase: true, includeLowercase: true, includeNumbers: true, includeSymbols: true });

    expect(pwd1.length).toBe(16);
    expect(pwd2.length).toBe(32);
  });

  it('should respect character set constraints', () => {
    const numericOnly = generateSecurePassword({
      length: 12,
      includeUppercase: false,
      includeLowercase: false,
      includeNumbers: true,
      includeSymbols: false,
    });
    expect(/^[0-9]+$/.test(numericOnly)).toBe(true);

    const noSymbols = generateSecurePassword({
      length: 20,
      includeUppercase: true,
      includeLowercase: true,
      includeNumbers: true,
      includeSymbols: false,
    });
    expect(/^[A-Za-z0-9]+$/.test(noSymbols)).toBe(true);
  });

  it('should generate valid multi-word passphrases', () => {
    const passphrase = generatePassphrase(4, '-');
    const parts = passphrase.split('-');

    expect(parts.length).toBe(5); // 4 words + 1 trailing number
    expect(typeof passphrase).toBe('string');
  });

  it('should estimate password strength correctly', () => {
    expect(estimatePasswordStrength('').score).toBe(0);
    expect(estimatePasswordStrength('weak').score).toBeLessThan(40);
    expect(estimatePasswordStrength('SuperP@ssw0rd2026!Extreme').score).toBeGreaterThanOrEqual(90);
  });
});
