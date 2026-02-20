import { Request, Response } from 'express';
import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  generateVerificationCode,
  generateRandomToken,
  validatePassword,
  validateEmail,
} from '../utils/auth';
import {
  sendInvitationEmail,
  sendPasswordResetEmail,
} from '../services/emailService';

import { sendRegistrationVerificationEmail, sendRegistrationRequestEmail } from '../services/emailService';

// Note: database access is performed via `query` when DB_AVAILABLE is true.

/**
 * POST /api/auth/login
 * Login with email/username and password
 */
export async function login(req: Request, res: Response) {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Login and password required' });
    }

    // Find user by email or username
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT * FROM users WHERE email = $1 OR username = $1', [login]);
      if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      user = result.rows[0];
    } else {
      const users = await jsonStore.getAll('users');
      user = users.find((u: any) => u.email === login || u.username === login) || null;
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) return res.status(403).json({ error: 'Account is disabled' });

    // Verify password
    if (!user.password_hash) {
      // No password set for this user
      return res.status(500).json({ error: 'User has no password set' });
    }
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.email_verified,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

/**
 * POST /api/auth/register
 * Register with invitation token
 */
export async function register(req: Request, res: Response) {
  try {
    const { token, username, password } = req.body;

    if (!token || !username || !password) {
      return res.status(400).json({ error: 'Token, username, and password required' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Verify invitation token
    let invitation: any = null;
    if (DB_AVAILABLE) {
      const tokenResult = await query('SELECT * FROM invitation_tokens WHERE token = $1 AND used = FALSE AND expires_at > NOW()', [token]);
      if (tokenResult.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired invitation token' });
      invitation = tokenResult.rows[0];
    } else {
      const tokens = await jsonStore.findByField('invitation_tokens', 'token', token);
      invitation = tokens.find((t: any) => t.used === false && new Date(t.expires_at) > new Date()) || null;
      if (!invitation) return res.status(400).json({ error: 'Invalid or expired invitation token' });
    }

    // Check if username already exists
    // Check if username/email already exist
    if (DB_AVAILABLE) {
      const usernameCheck = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (usernameCheck.rows.length > 0) return res.status(400).json({ error: 'Username already taken' });
      const emailCheck = await query('SELECT id FROM users WHERE email = $1', [invitation.email]);
      if (emailCheck.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
    } else {
      const users = await jsonStore.getAll('users');
      if (users.some((u: any) => u.username === username)) return res.status(400).json({ error: 'Username already taken' });
      if (users.some((u: any) => u.email === invitation.email)) return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    let newUser: any = null;
    if (DB_AVAILABLE) {
      const userResult = await query(`INSERT INTO users (username, email, password_hash, role, email_verified) VALUES ($1, $2, $3, 'user', TRUE) RETURNING id, username, email, role, email_verified, created_at`, [username, invitation.email, passwordHash]);
      newUser = userResult.rows[0];
      await query('UPDATE invitation_tokens SET used = TRUE WHERE token = $1', [token]);
    } else {
      newUser = await jsonStore.insert('users', { username, email: invitation.email, password_hash: passwordHash, role: 'user', email_verified: true, is_active: true, created_at: new Date().toISOString() });
      // mark token used in JSON tokens store if present
      const tokens = await jsonStore.findByField('invitation_tokens', 'token', token);
      if (tokens.length > 0) {
        const t = tokens[0];
        await jsonStore.updateById('invitation_tokens', t.id, { used: true });
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken(newUser.id, newUser.email, newUser.role);
    const refreshToken = generateRefreshToken(newUser.id);

    res.status(201).json({
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        emailVerified: newUser.email_verified,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Request password reset code
 */
export async function forgotPassword(req: Request, res: Response) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Find user
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT id, email, username FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) return res.json({ message: 'If the email exists, a reset code has been sent' });
      user = result.rows[0];
    } else {
      const users = await jsonStore.findByField('users', 'email', email);
      if (!users || users.length === 0) return res.json({ message: 'If the email exists, a reset code has been sent' });
      user = users[0];
    }

    // Generate 6-digit code
    const resetCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset code
    if (DB_AVAILABLE) {
      await query('UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3', [resetCode, expiresAt, user.id]);
    } else {
      await jsonStore.updateById('users', user.id, { reset_token: resetCode, reset_token_expires: expiresAt.toISOString() });
    }

    // Send email
    await sendPasswordResetEmail(user.email, resetCode);

    res.json({ message: 'If the email exists, a reset code has been sent' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password with verification code
 */
export async function resetPassword(req: Request, res: Response) {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password required' });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Verify code
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query(`SELECT id, email FROM users WHERE email = $1 AND reset_token = $2 AND reset_token_expires > NOW()`, [email, code]);
      if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid or expired reset code' });
      user = result.rows[0];
    } else {
      const users = await jsonStore.findByField('users', 'email', email);
      const found = users.find((u: any) => u.reset_token === code && new Date(u.reset_token_expires) > new Date());
      if (!found) return res.status(400).json({ error: 'Invalid or expired reset code' });
      user = found;
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and clear reset token
    if (DB_AVAILABLE) {
      await query('UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2', [passwordHash, user.id]);
    } else {
      await jsonStore.updateById('users', user.id, { password_hash: passwordHash, reset_token: null, reset_token_expires: null });
    }

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
}

/**
 * POST /api/auth/register/request
 * Start registration: validate input, generate verification code, store pending registration, send code via email
 */
export async function registerRequest(req: Request, res: Response) {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: 'Email, username and password required' });

    if (!validateEmail(email)) return res.status(400).json({ error: 'Invalid email format' });

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) return res.status(400).json({ error: passwordValidation.message });

    // Check email not already registered
    if (DB_AVAILABLE) {
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) return res.status(400).json({ error: 'Email already registered' });
      const uname = await query('SELECT id FROM users WHERE username = $1', [username]);
      if (uname.rows.length > 0) return res.status(400).json({ error: 'Username already taken' });
    } else {
      const users = await jsonStore.getAll('users');
      if (users.some((u: any) => u.email === email)) return res.status(400).json({ error: 'Email already registered' });
      if (users.some((u: any) => u.username === username)) return res.status(400).json({ error: 'Username already taken' });
    }

    // Generate code and hash password
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const passwordHash = await hashPassword(password);

    // Store pending registration in jsonStore (simple fallback)
    const pending = {
      email,
      username,
      password_hash: passwordHash,
      code,
      expires_at: expiresAt.toISOString(),
      created_at: new Date().toISOString(),
    };

    await jsonStore.insert('pending_registrations', pending);

    // Send email with code
    try {
      await sendRegistrationVerificationEmail(email, code);
    } catch (e) {
      console.error('Failed to send verification code email:', e);
    }

    res.json({ message: 'Verification code sent' });
  } catch (error) {
    console.error('registerRequest error:', error);
    res.status(500).json({ error: 'Failed to start registration' });
  }
}

/**
 * POST /api/auth/register/confirm
 * Confirm verification code -> create registration_request for admin approval
 */
export async function registerConfirm(req: Request, res: Response) {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });

    // Find pending registration
    const pendings = await jsonStore.findByField('pending_registrations', 'email', email);
    const pending = (pendings || []).find((p: any) => p.code === code);
    if (!pending) return res.status(400).json({ error: 'Invalid code or email' });

    if (new Date(pending.expires_at) < new Date()) return res.status(400).json({ error: 'Code expired' });

    // Create registration request entry
    const request = {
      email: pending.email,
      name: pending.username,
      provider: 'local',
      profile: null,
      password_hash: pending.password_hash,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await jsonStore.insert('registration_requests', request);

    // Remove pending registration
    const pend = await jsonStore.getAll('pending_registrations');
    const item = pend.find((p: any) => p.email === email && p.code === code);
    if (item) await jsonStore.deleteById('pending_registrations', item.id);

    // Notify admin
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USERNAME || null;
    if (adminEmail) {
      try {
        await sendRegistrationRequestEmail(adminEmail, pending.email, pending.username);
      } catch (e) {
        console.error('Failed to send admin notification for registration request:', e);
      }
    }

    res.json({ message: 'Request submitted for admin approval' });
  } catch (error) {
    console.error('registerConfirm error:', error);
    res.status(500).json({ error: 'Failed to confirm registration' });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Verify refresh token (this will throw if invalid)
    const decoded: any = require('../utils/auth').verifyToken(refreshToken);
    // Get user details
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT id, email, role FROM users WHERE id = $1 AND is_active = TRUE', [decoded.userId]);
      if (result.rows.length === 0) return res.status(403).json({ error: 'User not found or inactive' });
      user = result.rows[0];
    } else {
      const u = await jsonStore.getById('users', decoded.userId);
      if (!u || !u.is_active) return res.status(403).json({ error: 'User not found or inactive' });
      user = u;
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.email, user.role);

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(403).json({ error: 'Invalid refresh token' });
  }
}

/**
 * GET /api/auth/me
 * Get current user info (requires authentication)
 */
export async function getCurrentUser(req: Request, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT id, username, email, role, email_verified, created_at FROM users WHERE id = $1', [req.user.userId]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      user = result.rows[0];
    } else {
      const u = await jsonStore.getById('users', req.user.userId);
      if (!u) return res.status(404).json({ error: 'User not found' });
      user = u;
    }

    res.json({ user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
}

export default {
  login,
  register,
  forgotPassword,
  resetPassword,
  refreshToken,
  getCurrentUser,
};

/**
 * GET /api/auth/google
 * Redirect user to Google's OAuth2 consent screen
 */
export async function googleAuthStart(req: Request, res: Response) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.VITE_API_URL}/auth/google/callback`;
    if (!clientId || !redirectUri) return res.status(500).json({ error: 'Google OAuth not configured' });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return res.redirect(authUrl);
  } catch (err) {
    console.error('googleAuthStart error:', err);
    return res.status(500).json({ error: 'Failed to start Google OAuth' });
  }
}

/**
 * GET /api/auth/google/callback
 * Exchange code for tokens, verify user exists in our system, then issue app JWTs
 * Only allow login for users that already exist in the DB/json store — do not create new users.
 */
export async function googleAuthCallback(req: Request, res: Response) {
  try {
    const code = (req.query.code as string) || null;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!code) return res.redirect(`${frontendUrl}/login?error=missing_code`);

    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', process.env.GOOGLE_CLIENT_ID || '');
    params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET || '');
    params.append('redirect_uri', process.env.GOOGLE_REDIRECT_URI || '');
    params.append('grant_type', 'authorization_code');

    // Exchange code for tokens
    const axios = require('axios');
    const tokenResp = await axios.post(tokenEndpoint, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenResp.data.access_token;
    if (!accessToken) return res.redirect(`${frontendUrl}/login?error=token_exchange_failed`);

    // Get user info
    const userInfoResp = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profile = userInfoResp.data;
    const email = profile.email;

    if (!email) return res.redirect(`${frontendUrl}/login?error=no_email`);

    // Find existing user — DO NOT create new users
    let user: any = null;
    if (DB_AVAILABLE) {
      const result = await query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.redirect(`${frontendUrl}/login?error=account_not_found`);
      }
      user = result.rows[0];
    } else {
      const users = await jsonStore.findByField('users', 'email', email);
      if (!users || users.length === 0) {
        return res.redirect(`${frontendUrl}/login?error=account_not_found`);
      }
      user = users[0];
    }

    if (!user.is_active) return res.redirect(`${frontendUrl}/login?error=account_disabled`);

    // Issue app tokens
    const appAccessToken = generateAccessToken(user.id, user.email, user.role || 'user');
    const appRefreshToken = generateRefreshToken(user.id);

    // Redirect back to frontend with tokens (frontend will store them)
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${encodeURIComponent(appAccessToken)}&refreshToken=${encodeURIComponent(appRefreshToken)}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('googleAuthCallback error:', (err as any)?.response?.data || err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/login?error=oauth_error`);
  }
}

/**
 * GET /api/auth/google/register
 * Start Google OAuth for registration (will create a pending request upon callback)
 */
export async function googleRegisterStart(req: Request, res: Response) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || `${process.env.VITE_API_URL}/auth/google/register/callback`).replace(/\/$/, '');
    if (!clientId || !redirectUri) return res.status(500).json({ error: 'Google OAuth not configured' });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    return res.redirect(authUrl);
  } catch (err) {
    console.error('googleRegisterStart error:', err);
    return res.status(500).json({ error: 'Failed to start Google OAuth (register)' });
  }
}

/**
 * GET /api/auth/google/register/callback
 * Exchange code -> fetch profile -> create registration request and notify admin
 */
export async function googleRegisterCallback(req: Request, res: Response) {
  try {
    const code = (req.query.code as string) || null;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    if (!code) return res.redirect(`${frontendUrl}/register?error=missing_code`);

    const tokenEndpoint = 'https://oauth2.googleapis.com/token';
    const params = new URLSearchParams();
    params.append('code', code);
    params.append('client_id', process.env.GOOGLE_CLIENT_ID || '');
    params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET || '');
    // callback specific for register
    params.append('redirect_uri', process.env.GOOGLE_REDIRECT_URI?.replace(/\/api\/auth\/google\/callback$/, '/api/auth/google/register/callback') || '');
    params.append('grant_type', 'authorization_code');

    const axios = require('axios');
    const tokenResp = await axios.post(tokenEndpoint, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const accessToken = tokenResp.data.access_token;
    if (!accessToken) return res.redirect(`${frontendUrl}/register?error=token_exchange_failed`);

    const userInfoResp = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profile = userInfoResp.data;
    const email = profile.email;
    const name = profile.name || profile.given_name || '';

    if (!email) return res.redirect(`${frontendUrl}/register?error=no_email`);

    // If user exists, redirect to login with message
    if (DB_AVAILABLE) {
      const result = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (result.rows.length > 0) {
        return res.redirect(`${frontendUrl}/login?info=account_exists`);
      }
    } else {
      const users = await jsonStore.findByField('users', 'email', email);
      if (users && users.length > 0) return res.redirect(`${frontendUrl}/login?info=account_exists`);
    }

    // Create registration request record (json fallback or DB) - for simplicity use jsonStore
    const request = {
      email,
      name,
      provider: 'google',
      profile,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    await jsonStore.insert('registration_requests', request);

    // Notify admin via email
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USERNAME || null;
    if (adminEmail) {
      const { sendRegistrationRequestEmail } = require('../services/emailService');
      try {
        await sendRegistrationRequestEmail(adminEmail, email, name);
      } catch (emailErr) {
        console.error('Failed to send registration request email:', emailErr);
      }
    }

    // Redirect to register page with info
    return res.redirect(`${frontendUrl}/register?info=request_sent`);
  } catch (err) {
    console.error('googleRegisterCallback error:', (err as any)?.response?.data || err);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/register?error=oauth_error`);
  }
}
