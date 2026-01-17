import { z } from 'zod';

/**
 * Schema dla logowania
 * Frontend wysyła 'login' (może być username lub email)
 */
export const loginSchema = z.object({
  body: z.object({
    login: z.string().min(1, 'Login is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Schema dla rejestracji
 */
export const registerSchema = z.object({
  body: z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email must not exceed 255 characters'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters'),
  }),
});

/**
 * Schema dla zapomnienia hasła
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
  }),
});

/**
 * Schema dla resetu hasła
 * Frontend wysyła email, code (6-cyfrowy), newPassword
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    code: z.string().length(6, 'Reset code must be 6 digits'),
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters'),
  }),
});

/**
 * Schema dla refresh tokenu
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
});

/**
 * Schema dla register request (z email weryfikacją)
 */
export const registerRequestSchema = z.object({
  body: z.object({
    username: z.string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must not exceed 50 characters')
      .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores and hyphens'),
    email: z.string()
      .email('Invalid email format')
      .max(255, 'Email must not exceed 255 characters'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must not exceed 128 characters'),
  }),
});

/**
 * Schema dla register confirm
 * Frontend wysyła email i code (6-cyfrowy)
 */
export const registerConfirmSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    code: z.string().length(6, 'Confirmation code must be 6 digits'),
  }),
});
