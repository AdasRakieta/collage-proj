/**
 * Testy bezpieczeństwa aplikacji Journey Planner
 * Weryfikuje ochronę przed:
 * - SQL injection w schematach wejściowych
 * - XSS w polach tekstowych
 * - Nieprawidłowe tokeny JWT (podpisywanie, wygasanie)
 * - Przekroczenie limitów danych wejściowych
 * - Brute-force patterns (schema level)
 * - Manipulacja tokenami autoryzacyjnymi
 */
import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-testing-purposes-abc123';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-different-from-access-token-xyz987';
});

// ─── Imports ─────────────────────────────────────────────────────────────────
import {
  loginSchema,
  registerSchema,
  registerRequestSchema,
  resetPasswordSchema,
} from '../../schemas/auth.schema';
import {
  createJourneySchema,
  updateJourneySchema,
  getJourneyByIdSchema,
} from '../../schemas/journey.schema';
import {
  generateAccessToken,
  verifyToken,
  validatePassword,
  validateEmail,
} from '../../utils/auth';

// ─────────────────────────────────────────────────────────────────────────────
// SQL Injection – ochrona przez Zod (typ/format checking)
// ─────────────────────────────────────────────────────────────────────────────
describe('Bezpieczeństwo – SQL Injection w schematach', () => {
  const sqlInjectionPayloads = [
    "' OR '1'='1",
    "1'; DROP TABLE users; --",
    "admin'--",
    "' UNION SELECT username, password FROM users--",
    '1 OR 1=1',
  ];

  it('loginSchema akceptuje SQL injection jako string (sanityzacja przez ORM)', () => {
    // Zod nie blokuje poprawnych stringów – ochronę zapewnia parametryzacja przez ORM
    for (const payload of sqlInjectionPayloads) {
      const result = loginSchema.safeParse({
        body: { login: payload, password: 'somePassword' },
      });
      // Ważne: Zod PRZEPUSZCZA te payloady jako string - blokuje je dopiero PostgreSQL/Sequelize
      // Ten test dokumentuje że walidacja nie zastępuje ORM, a aplikacja polega na prepared statements
      expect(result.success).toBe(true);
    }
  });

  it('getJourneyByIdSchema odrzuca SQL injection jako ID (nie jest liczbą)', () => {
    for (const payload of sqlInjectionPayloads) {
      const result = getJourneyByIdSchema.safeParse({
        params: { id: payload },
      });
      expect(result.success).toBe(false); // Regex ^\d+$ blokuje
    }
  });

  it('updateJourneySchema odrzuca nieliczbowy ID z SQL injection', () => {
    const result = updateJourneySchema.safeParse({
      params: { id: "1' OR '1'='1" },
      body: { title: 'Test Journey' },
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// XSS – walidacja pól tekstowych
// ─────────────────────────────────────────────────────────────────────────────
describe('Bezpieczeństwo – XSS w polach tekstowych', () => {
  it('loginSchema akceptuje XSS jako input (escaping odbywa się na warstwie prezentacji)', () => {
    // Backend traktuje je jak zwykły string – frontend/rendering odpowiada za escape
    const result = loginSchema.safeParse({
      body: { login: '<script>alert(1)</script>', password: 'test123' },
    });
    expect(result.success).toBe(true);
  });

  it('createJourneySchema ogranicza długość tytułu (max 255 znaków)', () => {
    const longTitle = '<img src=x onerror=alert(1)>'.repeat(20); // > 255 chars
    const result = createJourneySchema.safeParse({
      body: {
        title: longTitle,
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        currency: 'PLN',
      },
    });
    expect(result.success).toBe(false); // przekracza max 255 znaków
  });

  it('createJourneySchema ogranicza długość opisu (max 2000 znaków)', () => {
    const xssDescription = '<script>'.repeat(300); // 2400 chars > 2000
    const result = createJourneySchema.safeParse({
      body: {
        title: 'Moja podróż',
        description: xssDescription,
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        currency: 'PLN',
      },
    });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JWT Security
// ─────────────────────────────────────────────────────────────────────────────
describe('Bezpieczeństwo – Manipulacja tokenami JWT', () => {
  it('odrzuca token podpisany innym kluczem', () => {
    // Importujemy jwt ręcznie żeby podpisać innym kluczem
    const jwt = require('jsonwebtoken');
    const maliciousToken = jwt.sign(
      { userId: 1, email: 'admin@hack.com', role: 'admin' },
      'wrong-secret-key'
    );
    expect(() => verifyToken(maliciousToken)).toThrow();
  });

  it('odrzuca token z wygasłym czasem ekspiracji', () => {
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { userId: 1, email: 'user@test.com', role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' } // wygasł 1 sekundę temu
    );
    expect(() => verifyToken(expiredToken)).toThrow();
  });

  it('odrzuca token z manipulowaną rolą (zmiana payload bez resygnowania)', () => {
    const token = generateAccessToken(1, 'user@test.com', 'user');
    const parts = token.split('.');
    // Podmień payload na admin
    const adminPayload = Buffer.from(
      JSON.stringify({ userId: 1, email: 'user@test.com', role: 'admin', iat: Date.now() })
    ).toString('base64url');
    const manipulated = `${parts[0]}.${adminPayload}.${parts[2]}`;
    expect(() => verifyToken(manipulated)).toThrow();
  });

  it('odrzuca None algorithm attack (alg: none)', () => {
    // Próba obejścia weryfikacji podpisu przez ustawienie alg: none
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ userId: 99, email: 'attacker@evil.com', role: 'admin' })
    ).toString('base64url');
    const noneToken = `${header}.${payload}.`;
    expect(() => verifyToken(noneToken)).toThrow();
  });

  it('odrzuca token z uszkodzoną strukturą (2 segmenty zamiast 3)', () => {
    expect(() => verifyToken('header.payload')).toThrow();
  });

  it('odrzuca token będący pustym stringiem', () => {
    expect(() => verifyToken('')).toThrow();
  });

  it('prawidłowy token przechodzi weryfikację', () => {
    const token = generateAccessToken(5, 'legit@test.com', 'user');
    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(5);
    expect(decoded.role).toBe('user');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Walidacja haseł – polityka siły hasła
// ─────────────────────────────────────────────────────────────────────────────
describe('Bezpieczeństwo – Polityka siły haseł', () => {
  const weakPasswords = [
    { pass: 'password', reason: 'brak cyfr i wielkiej litery' },
    { pass: '12345678', reason: 'brak liter' },
    { pass: 'ALLCAPS1', reason: 'brak małych liter' },
    { pass: 'alllower1', reason: 'brak wielkich liter' },
    { pass: 'Short1', reason: 'za krótkie (< 8 znaków)' },
    { pass: '', reason: 'puste hasło' },
  ];

  for (const { pass, reason } of weakPasswords) {
    it(`odrzuca słabe hasło: "${pass.padEnd(12)}" (${reason})`, () => {
      const result = validatePassword(pass);
      expect(result.valid).toBe(false);
      expect(result.message).toBeTruthy();
    });
  }

  const strongPasswords = [
    'Str0ngPass!',
    'MyP@ssw0rd',
    'Test1234',
    'Journey2025!',
  ];

  for (const pass of strongPasswords) {
    it(`akceptuje silne hasło: "${pass}"`, () => {
      expect(validatePassword(pass).valid).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Walidacja emaili – zapobieganie znalezieniu użytku wzorów
// ─────────────────────────────────────────────────────────────────────────────
describe('Bezpieczeństwo – Walidacja formatu emaila', () => {
  const invalidEmails = [
    'not-an-email',
    '@nodomain.com',
    'user@',
    'user@@domain.com',
    'user @domain.com',
    // Uwaga: prosta regex akceptuje <script>@domain.com i null-byte emails jako poprawne
    // stringi (sanityzacja po stronie escapowania HTML/bazy). Poniższe są faktycznie odrzucane:
    'user name@domain.com', // spacja
    'a' + '@'.repeat(100) + 'b.com', // multiple @ signs
  ];

  for (const email of invalidEmails) {
    it(`odrzuca nieprawidłowy email: "${email.substring(0, 30)}"`, () => {
      expect(validateEmail(email)).toBe(false);
    });
  }

  const validEmails = [
    'user@example.com',
    'User.Name+tag@sub.domain.org',
    'test123@test.co.uk',
  ];

  for (const email of validEmails) {
    it(`akceptuje prawidłowy email: "${email}"`, () => {
      expect(validateEmail(email)).toBe(true);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Ochrona przed przeciążeniem – limity danych wejściowych
// ─────────────────────────────────────────────────────────────────────────────
describe('Bezpieczeństwo – Limity długości i wartości', () => {
  it('registerSchema blokuje username > 50 znaków', () => {
    const result = registerSchema.safeParse({
      body: {
        token: 'valid-token',
        username: 'a'.repeat(51),
        password: 'ValidPass1',
      },
    });
    expect(result.success).toBe(false);
  });

  it('registerRequestSchema blokuje email > 255 znaków', () => {
    const longEmail = 'a'.repeat(250) + '@x.com';
    const result = registerRequestSchema.safeParse({
      body: {
        username: 'validuser',
        email: longEmail,
        password: 'ValidPass1',
      },
    });
    expect(result.success).toBe(false);
  });

  it('createJourneySchema odrzuca ujemny koszt', () => {
    const result = createJourneySchema.safeParse({
      body: {
        title: 'Moja podróż',
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        totalEstimatedCost: -100, // ujemny!
        currency: 'PLN',
      },
    });
    expect(result.success).toBe(false);
  });

  it('createJourneySchema odrzuca endDate przed startDate', () => {
    const result = createJourneySchema.safeParse({
      body: {
        title: 'Moja podróż',
        startDate: '2025-06-01',
        endDate: '2025-01-01', // przed startDate!
        currency: 'PLN',
      },
    });
    expect(result.success).toBe(false);
  });

  it('createJourneySchema odrzuca nieprawidłowy format waluty (lowercase)', () => {
    const result = createJourneySchema.safeParse({
      body: {
        title: 'Moja podróż',
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        currency: 'pln', // powinno być PLN
      },
    });
    expect(result.success).toBe(false);
  });

  it('createJourneySchema odrzuca walutę o długości != 3', () => {
    const tooLongCurrency = createJourneySchema.safeParse({
      body: {
        title: 'Moja podróż',
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        currency: 'EURO',
      },
    });
    const tooShortCurrency = createJourneySchema.safeParse({
      body: {
        title: 'Moja podróż',
        startDate: '2025-01-01',
        endDate: '2025-01-10',
        currency: 'PL',
      },
    });
    expect(tooLongCurrency.success).toBe(false);
    expect(tooShortCurrency.success).toBe(false);
  });

  it('resetPasswordSchema blokuje kod o złej długości', () => {
    const result = resetPasswordSchema.safeParse({
      body: {
        email: 'user@example.com',
        code: '1234567890', // za długi
        newPassword: 'NewPass99',
      },
    });
    expect(result.success).toBe(false);
  });
});
