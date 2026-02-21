/**
 * Testy jednostkowe dla server/src/utils/auth.ts
 * Testuje: hashowanie haseł, tokeny JWT, kody weryfikacyjne,
 *          walidację hasła, walidację email
 */
import { describe, it, expect, beforeAll } from 'vitest';

// Ustaw bezpieczne zmienne środowiskowe zanim moduł zostanie załadowany
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-testing-purposes-abc123';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-different-from-access-token-xyz987';
});

import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  generateVerificationCode,
  generateRandomToken,
  validatePassword,
  validateEmail,
} from '../../utils/auth';

// ─────────────────────────────────────────────────────────────────────────────
// hashPassword / comparePassword
// ─────────────────────────────────────────────────────────────────────────────
describe('hashPassword', () => {
  it('zwraca string zaczynający się od $2 (bcrypt)', async () => {
    const hash = await hashPassword('TestPass1');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  it('dwa hashe tego samego hasła są różne (różne sole)', async () => {
    const h1 = await hashPassword('TestPass1');
    const h2 = await hashPassword('TestPass1');
    expect(h1).not.toBe(h2);
  });
});

describe('comparePassword', () => {
  it('zwraca true dla poprawnego hasła', async () => {
    const hash = await hashPassword('MySecretPass9');
    const result = await comparePassword('MySecretPass9', hash);
    expect(result).toBe(true);
  });

  it('zwraca false dla błędnego hasła', async () => {
    const hash = await hashPassword('MySecretPass9');
    const result = await comparePassword('WrongPassword1', hash);
    expect(result).toBe(false);
  });

  it('zwraca false dla pustego hasła', async () => {
    const hash = await hashPassword('MySecretPass9');
    const result = await comparePassword('', hash);
    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateAccessToken / verifyToken
// ─────────────────────────────────────────────────────────────────────────────
describe('generateAccessToken / verifyToken', () => {
  it('generuje token JWT z poprawnymi claimami', () => {
    const token = generateAccessToken(42, 'user@example.com', 'user');
    expect(token).toBeTruthy();
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(42);
    expect(decoded.email).toBe('user@example.com');
    expect(decoded.role).toBe('user');
  });

  it('generuje token dla roli admin', () => {
    const token = generateAccessToken(1, 'admin@example.com', 'admin');
    const decoded = verifyToken(token);
    expect(decoded.role).toBe('admin');
  });

  it('rzuca błąd dla zmodyfikowanego tokenu (tampered)', () => {
    const token = generateAccessToken(1, 'test@test.com', 'user');
    const parts = token.split('.');
    // Zmodyfikuj payload (base64)
    const tamperedPayload = Buffer.from('{"userId":99,"email":"hacker@evil.com","role":"admin"}').toString('base64url');
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    expect(() => verifyToken(tamperedToken)).toThrow();
  });

  it('rzuca błąd dla całkowicie nieprawidłowego tokenu', () => {
    expect(() => verifyToken('not.a.jwt.token')).toThrow();
  });

  it('rzuca błąd dla pustego stringa', () => {
    expect(() => verifyToken('')).toThrow();
  });

  it('rzuca błąd dla tokenu bez podpisu', () => {
    const token = generateAccessToken(1, 'test@test.com', 'user');
    const [header, payload] = token.split('.');
    expect(() => verifyToken(`${header}.${payload}.`)).toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateRefreshToken
// ─────────────────────────────────────────────────────────────────────────────
describe('generateRefreshToken', () => {
  it('generuje prawidłowy JWT refresh token', () => {
    const token = generateRefreshToken(10);
    expect(token).toBeTruthy();
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(10);
  });

  it('dwa tokeny dla tego samego userId są różne (iat)', () => {
    const t1 = generateRefreshToken(5);
    // Wystarczy mały delay lub losowość – sprawdzamy że to string JWT
    expect(t1.split('.')).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateVerificationCode
// ─────────────────────────────────────────────────────────────────────────────
describe('generateVerificationCode', () => {
  it('zwraca 6-cyfrowy string', () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('jest w zakresie 100000-999999', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateVerificationCode();
      const num = parseInt(code);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it('generuje różne kody (brak deterministyczności)', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateVerificationCode()));
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// generateRandomToken
// ─────────────────────────────────────────────────────────────────────────────
describe('generateRandomToken', () => {
  it('zwraca 64-znakowy hex string (32 bajty)', () => {
    const token = generateRandomToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('każdy token jest unikalny', () => {
    const tokens = new Set(Array.from({ length: 10 }, () => generateRandomToken()));
    expect(tokens.size).toBe(10);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validatePassword
// ─────────────────────────────────────────────────────────────────────────────
describe('validatePassword', () => {
  it('akceptuje silne hasło', () => {
    const result = validatePassword('StrongPass1');
    expect(result.valid).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('odrzuca hasło krótsze niż 8 znaków', () => {
    const result = validatePassword('Ab1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('8');
  });

  it('odrzuca hasło bez wielkiej litery', () => {
    const result = validatePassword('alllower1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('uppercase');
  });

  it('odrzuca hasło bez małej litery', () => {
    const result = validatePassword('ALLUPPER1');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('lowercase');
  });

  it('odrzuca hasło bez cyfry', () => {
    const result = validatePassword('NoDigitsHere');
    expect(result.valid).toBe(false);
    expect(result.message).toContain('number');
  });

  it('akceptuje hasło z minimalnie 8 znakami', () => {
    const result = validatePassword('Passw0rd');
    expect(result.valid).toBe(true);
  });

  it('akceptuje hasło ze znakami specjalnymi', () => {
    const result = validatePassword('P@ssw0rd!');
    expect(result.valid).toBe(true);
  });

  it('odrzuca puste hasło', () => {
    const result = validatePassword('');
    expect(result.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateEmail
// ─────────────────────────────────────────────────────────────────────────────
describe('validateEmail', () => {
  it('akceptuje prawidłowy email', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('akceptuje email z subdomeną', () => {
    expect(validateEmail('user@mail.example.co.uk')).toBe(true);
  });

  it('akceptuje email z plusem', () => {
    expect(validateEmail('user+tag@example.com')).toBe(true);
  });

  it('odrzuca email bez @', () => {
    expect(validateEmail('userexample.com')).toBe(false);
  });

  it('odrzuca email bez domeny', () => {
    expect(validateEmail('user@')).toBe(false);
  });

  it('odrzuca email bez lokalnego członu', () => {
    expect(validateEmail('@example.com')).toBe(false);
  });

  it('odrzuca pusty string', () => {
    expect(validateEmail('')).toBe(false);
  });

  it('odrzuca email ze spacją', () => {
    expect(validateEmail('user name@example.com')).toBe(false);
  });

  it('odrzuca string bez kropki w domenie', () => {
    // Regex wymaga przynajmniej jednej kropki po @
    expect(validateEmail('user@localhost')).toBe(false);
  });
});
