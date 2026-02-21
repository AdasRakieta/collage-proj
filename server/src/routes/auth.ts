import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  refreshToken,
  getCurrentUser,
  registerRequest,
  registerConfirm,
} from '../controllers/authController';
import { googleAuthStart, googleAuthCallback } from '../controllers/authController';
import { googleRegisterStart, googleRegisterCallback } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
  registerRequestSchema,
  registerConfirmSchema,
} from '../schemas/auth.schema';

const router = express.Router();

// Rate limiting dla auth endpoints (ochrona przed brute-force)
// rate limiter configuration may be relaxed in development so that
// developers don't get locked out while testing credentials repeatedly.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  // express-rate-limit attaches this message as `err.message` or body
  message: { error: 'Too many authentication attempts, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 godzina
  max: 3, // max 3 rejestracje na IP
  message: 'Too many registration attempts, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// Public routes z walidacją i rate limiting
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/register', registerLimiter, validate(registerSchema), register);
// Registration request flow (email verification -> admin approval)
router.post('/register/request', registerLimiter, validate(registerRequestSchema), registerRequest);
router.post('/register/confirm', validate(registerConfirmSchema), registerConfirm);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

// Google OAuth
router.get('/google', googleAuthStart);
router.get('/google/callback', googleAuthCallback);
// Google registration flow (creates a pending request for admin approval)
router.get('/google/register', googleRegisterStart);
router.get('/google/register/callback', googleRegisterCallback);

export default router;
