/**
 * Testy jednostkowe dla server/src/middleware/auth.ts
 * Testuje: authenticateToken, requireAdmin, optionalAuth
 */
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Ustawienie zmiennych środowiskowych przed importem modułów
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-testing-purposes-abc123';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-different-from-access-token-xyz987';
});

import { generateAccessToken } from '../../utils/auth';
import {
  authenticateToken,
  requireAdmin,
  optionalAuth,
} from '../../middleware/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers do tworzenia mock requestów/odpowiedzi
// ─────────────────────────────────────────────────────────────────────────────
const createMockReq = (overrides: Partial<Request> = {}): Request => {
  return {
    headers: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
};

const createMockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

const createMockNext = (): NextFunction => vi.fn() as NextFunction;

// ─────────────────────────────────────────────────────────────────────────────
// authenticateToken
// ─────────────────────────────────────────────────────────────────────────────
describe('authenticateToken', () => {
  it('zwraca 401 gdy brak nagłówka Authorization', () => {
    const req = createMockReq({ headers: {} });
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('zwraca 401 gdy nagłówek Authorization nie ma tokenu (np. "Bearer ")', () => {
    const req = createMockReq({ headers: { authorization: 'Bearer ' } });
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('zwraca 403 dla nieprawidłowego tokenu JWT', () => {
    const req = createMockReq({ headers: { authorization: 'Bearer invalid.jwt.token' } });
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('wywołuje next() i ustawia req.user dla prawidłowego tokenu', () => {
    const token = generateAccessToken(7, 'alice@test.com', 'user');
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeDefined();
    expect(req.user?.userId).toBe(7);
    expect(req.user?.email).toBe('alice@test.com');
    expect(req.user?.role).toBe('user');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('wywołuje next() dla tokenu admina i ustawia role=admin', () => {
    const token = generateAccessToken(1, 'admin@test.com', 'admin');
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.role).toBe('admin');
  });

  it('zwraca 403 dla tokenu z błędnym podpisem (tampered)', () => {
    const token = generateAccessToken(1, 'test@test.com', 'user');
    const parts = token.split('.');
    const badToken = `${parts[0]}.${parts[1]}.bad_signature`;
    const req = createMockReq({ headers: { authorization: `Bearer ${badToken}` } });
    const res = createMockRes();
    const next = createMockNext();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireAdmin
// ─────────────────────────────────────────────────────────────────────────────
describe('requireAdmin', () => {
  it('zwraca 401 gdy req.user jest undefined', () => {
    const req = createMockReq({ user: undefined });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('zwraca 403 gdy użytkownik ma rolę "user"', () => {
    const req = createMockReq({
      user: { userId: 5, email: 'user@test.com', role: 'user' },
    });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('wywołuje next() dla użytkownika z rolą "admin"', () => {
    const req = createMockReq({
      user: { userId: 1, email: 'admin@test.com', role: 'admin' },
    });
    const res = createMockRes();
    const next = createMockNext();

    requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// optionalAuth
// ─────────────────────────────────────────────────────────────────────────────
describe('optionalAuth', () => {
  it('wywołuje next() i nie ustawia req.user gdy brak tokenu', () => {
    const req = createMockReq({ headers: {} });
    const res = createMockRes();
    const next = createMockNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });

  it('ustawia req.user i wywołuje next() dla prawidłowego tokenu', () => {
    const token = generateAccessToken(12, 'optional@test.com', 'user');
    const req = createMockReq({ headers: { authorization: `Bearer ${token}` } });
    const res = createMockRes();
    const next = createMockNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user?.userId).toBe(12);
    expect(req.user?.email).toBe('optional@test.com');
  });

  it('wywołuje next() bez ustawienia req.user dla nieprawidłowego tokenu', () => {
    const req = createMockReq({ headers: { authorization: 'Bearer invalid.token.here' } });
    const res = createMockRes();
    const next = createMockNext();

    optionalAuth(req, res, next);

    // Nie zwraca błędu – tylko ignoruje nieprawidłowy token
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('wywołuje next() dla pustego stringa Bearer', () => {
    const req = createMockReq({ headers: { authorization: 'Bearer ' } });
    const res = createMockRes();
    const next = createMockNext();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toBeUndefined();
  });
});
