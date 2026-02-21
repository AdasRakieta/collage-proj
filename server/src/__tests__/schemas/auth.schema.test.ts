/**
 * Testy walidacji schematów Zod dla autentykacji
 * server/src/schemas/auth.schema.ts
 */
import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  registerRequestSchema,
  registerConfirmSchema,
} from '../../schemas/auth.schema';

// ─────────────────────────────────────────────────────────────────────────────
// loginSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('loginSchema', () => {
  it('akceptuje poprawne dane logowania', () => {
    const result = loginSchema.safeParse({
      body: { login: 'testuser', password: 'secret' },
    });
    expect(result.success).toBe(true);
  });

  it('odrzuca brak loginu', () => {
    const result = loginSchema.safeParse({
      body: { password: 'secret' },
    });
    expect(result.success).toBe(false);
  });

  it('odrzuca pusty login', () => {
    const result = loginSchema.safeParse({
      body: { login: '', password: 'secret' },
    });
    expect(result.success).toBe(false);
  });

  it('odrzuca brak hasła', () => {
    const result = loginSchema.safeParse({
      body: { login: 'testuser' },
    });
    expect(result.success).toBe(false);
  });

  it('odrzuca puste hasło', () => {
    const result = loginSchema.safeParse({
      body: { login: 'testuser', password: '' },
    });
    expect(result.success).toBe(false);
  });

  it('akceptuje email jako login', () => {
    const result = loginSchema.safeParse({
      body: { login: 'user@example.com', password: 'MyPass123' },
    });
    expect(result.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// registerSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('registerSchema', () => {
  const validData = {
    body: {
      token: 'abc-invitation-token',
      username: 'newuser',
      password: 'ValidPass1',
    },
  };

  it('akceptuje poprawne dane rejestracji', () => {
    expect(registerSchema.safeParse(validData).success).toBe(true);
  });

  it('odrzuca brak tokenu', () => {
    const { body } = validData;
    const res = registerSchema.safeParse({ body: { ...body, token: undefined } });
    expect(res.success).toBe(false);
  });

  it('odrzuca username krótszy niż 3 znaki', () => {
    const res = registerSchema.safeParse({ body: { ...validData.body, username: 'ab' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca username dłuższy niż 50 znaków', () => {
    const longName = 'a'.repeat(51);
    const res = registerSchema.safeParse({ body: { ...validData.body, username: longName } });
    expect(res.success).toBe(false);
  });

  it('odrzuca username ze znakami specjalnymi', () => {
    const res = registerSchema.safeParse({ body: { ...validData.body, username: 'user@name' } });
    expect(res.success).toBe(false);
  });

  it('akceptuje username z myślnikiem i podkreślnikiem', () => {
    const res = registerSchema.safeParse({ body: { ...validData.body, username: 'user-name_1' } });
    expect(res.success).toBe(true);
  });

  it('odrzuca hasło krótsze niż 8 znaków', () => {
    const res = registerSchema.safeParse({ body: { ...validData.body, password: 'Ab1' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca hasło dłuższe niż 128 znaków', () => {
    const longPass = 'A1' + 'a'.repeat(127);
    const res = registerSchema.safeParse({ body: { ...validData.body, password: longPass } });
    expect(res.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// forgotPasswordSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('forgotPasswordSchema', () => {
  it('akceptuje prawidłowy email', () => {
    const res = forgotPasswordSchema.safeParse({ body: { email: 'test@example.com' } });
    expect(res.success).toBe(true);
  });

  it('odrzuca nieprawidłowy email', () => {
    const res = forgotPasswordSchema.safeParse({ body: { email: 'notanemail' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca pusty email', () => {
    const res = forgotPasswordSchema.safeParse({ body: { email: '' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca brak emaila', () => {
    const res = forgotPasswordSchema.safeParse({ body: {} });
    expect(res.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetPasswordSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('resetPasswordSchema', () => {
  const validData = {
    body: {
      email: 'user@example.com',
      code: '123456',
      newPassword: 'NewPass99',
    },
  };

  it('akceptuje poprawne dane resetu', () => {
    expect(resetPasswordSchema.safeParse(validData).success).toBe(true);
  });

  it('odrzuca kod z mniej niż 6 cyframi', () => {
    const res = resetPasswordSchema.safeParse({ body: { ...validData.body, code: '12345' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca kod z więcej niż 6 cyframi', () => {
    const res = resetPasswordSchema.safeParse({ body: { ...validData.body, code: '1234567' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca nieprawidłowy email', () => {
    const res = resetPasswordSchema.safeParse({ body: { ...validData.body, email: 'bad' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca zbyt krótkie nowe hasło', () => {
    const res = resetPasswordSchema.safeParse({ body: { ...validData.body, newPassword: 'Ab1' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca zbyt długie nowe hasło', () => {
    const longPass = 'A1' + 'a'.repeat(127);
    const res = resetPasswordSchema.safeParse({ body: { ...validData.body, newPassword: longPass } });
    expect(res.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// refreshTokenSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('refreshTokenSchema', () => {
  it('akceptuje refresh token', () => {
    const res = refreshTokenSchema.safeParse({ body: { refreshToken: 'some.jwt.token' } });
    expect(res.success).toBe(true);
  });

  it('odrzuca puste refreshToken', () => {
    const res = refreshTokenSchema.safeParse({ body: { refreshToken: '' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca brak refreshToken', () => {
    const res = refreshTokenSchema.safeParse({ body: {} });
    expect(res.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// registerRequestSchema
// ─────────────────────────────────────────────────────────────────────────────
describe('registerRequestSchema', () => {
  const validData = {
    body: {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'ValidPass1',
    },
  };

  it('akceptuje poprawne dane', () => {
    expect(registerRequestSchema.safeParse(validData).success).toBe(true);
  });

  it('odrzuca email dłuższy niż 255 znaków', () => {
    const longEmail = 'a'.repeat(247) + '@test.com'; // 256 chars > limit 255
    const res = registerRequestSchema.safeParse({ body: { ...validData.body, email: longEmail } });
    expect(res.success).toBe(false);
  });

  it('odrzuca username z niedozwolonymi znakami (np. spacja)', () => {
    const res = registerRequestSchema.safeParse({ body: { ...validData.body, username: 'bad name' } });
    expect(res.success).toBe(false);
  });

  it('odrzuca pusty email', () => {
    const res = registerRequestSchema.safeParse({ body: { ...validData.body, email: '' } });
    expect(res.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// registerConfirmSchema (odczytujemy ze schematu)
// ─────────────────────────────────────────────────────────────────────────────
describe('registerConfirmSchema', () => {
  it('akceptuje kompletne dane potwierdzenia', () => {
    const res = registerConfirmSchema.safeParse({
      body: { email: 'u@example.com', code: '654321' },
    });
    expect(res.success).toBe(true);
  });

  it('odrzuca kod o złej długości', () => {
    const res = registerConfirmSchema.safeParse({
      body: { email: 'u@example.com', code: '12345' },
    });
    expect(res.success).toBe(false);
  });

  it('odrzuca nieprawidłowy email', () => {
    const res = registerConfirmSchema.safeParse({
      body: { email: 'bad', code: '123456' },
    });
    expect(res.success).toBe(false);
  });
});
