/**
 * Testy jednostkowe dla server/src/middleware/validation.ts
 * Testuje: validate, validateBody, validateQuery
 */
import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateBody, validateQuery } from '../../middleware/validation';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const createMockReq = (overrides: Partial<Request> = {}): Request =>
  ({ body: {}, query: {}, params: {}, ...overrides } as unknown as Request);

const createMockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

const createNext = (): NextFunction => vi.fn() as NextFunction;

// ─────────────────────────────────────────────────────────────────────────────
// validate()  – waliduje { body, query, params }
// ─────────────────────────────────────────────────────────────────────────────
describe('validate()', () => {
  const schema = z.object({
    body: z.object({
      name: z.string().min(1),
      age: z.number().int().positive(),
    }),
  });

  it('wywołuje next() gdy dane są poprawne', async () => {
    const req = createMockReq({ body: { name: 'Jan', age: 30 } });
    const res = createMockRes();
    const next = createNext();
    const middleware = validate(schema);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('zwraca 400 gdy brakuje wymaganego pola', async () => {
    const req = createMockReq({ body: { age: 25 } }); // brak name
    const res = createMockRes();
    const next = createNext();
    const middleware = validate(schema);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('zwraca 400 gdy typ jest nieprawidłowy', async () => {
    const req = createMockReq({ body: { name: 'Jan', age: 'notanumber' } });
    const res = createMockRes();
    const next = createNext();
    const middleware = validate(schema);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.errors).toBeInstanceOf(Array);
    expect(jsonCall.errors.length).toBeGreaterThan(0);
  });

  it('zwraca tablicę błędów z polem path i message', async () => {
    const req = createMockReq({ body: {} });
    const res = createMockRes();
    const next = createNext();
    const middleware = validate(schema);

    await middleware(req, res, next);

    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.errors[0]).toHaveProperty('path');
    expect(jsonCall.errors[0]).toHaveProperty('message');
  });

  it('przepuszcza nieznany błąd do next(error)', async () => {
    const throwingSchema = {
      parseAsync: async () => { throw new Error('unexpected error'); },
    } as unknown as z.ZodSchema;

    const req = createMockReq({ body: {} });
    const res = createMockRes();
    const next = createNext();
    const middleware = validate(throwingSchema);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateBody() – waliduje tylko body
// ─────────────────────────────────────────────────────────────────────────────
describe('validateBody()', () => {
  const bodySchema = z.object({
    email: z.string().email(),
  });

  it('wywołuje next() i parsuje body gdy dane są poprawne', async () => {
    const req = createMockReq({ body: { email: 'hello@world.com' } });
    const res = createMockRes();
    const next = createNext();
    const middleware = validateBody(bodySchema);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.email).toBe('hello@world.com');
  });

  it('zwraca 400 dla nieprawidłowego emaila', async () => {
    const req = createMockReq({ body: { email: 'not-an-email' } });
    const res = createMockRes();
    const next = createNext();
    const middleware = validateBody(bodySchema);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.errors[0]).toHaveProperty('field');
    expect(jsonCall.errors[0]).toHaveProperty('message');
    expect(next).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// validateQuery() – waliduje tylko query params
// ─────────────────────────────────────────────────────────────────────────────
describe('validateQuery()', () => {
  const querySchema = z.object({
    page: z.coerce.number().int().positive().optional(),
  });

  it('wywołuje next() gdy query jest poprawne', async () => {
    const req = createMockReq({ query: { page: '3' } as any });
    const res = createMockRes();
    const next = createNext();
    const middleware = validateQuery(querySchema);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('zwraca 400 gdy wartość query nie spełnia schematu', async () => {
    const strictSchema = z.object({
      status: z.enum(['active', 'inactive']),
    });
    const req = createMockReq({ query: { status: 'pending' } as any });
    const res = createMockRes();
    const next = createNext();
    const middleware = validateQuery(strictSchema);

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    const jsonCall = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(jsonCall.message).toContain('validation failed');
    expect(next).not.toHaveBeenCalled();
  });
});
