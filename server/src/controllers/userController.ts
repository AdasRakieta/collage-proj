import { Request, Response } from 'express';
import { hashPassword, comparePassword, validatePassword } from '../utils/auth';
import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';

/**
 * PUT /api/user/profile
 * Update user's own profile (username)
 */
export async function updateProfile(req: Request, res: Response) {
  try {
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Check if username is already taken by another user
    if (DB_AVAILABLE) {
      const usernameCheck = await query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, req.user!.userId]);
      if (usernameCheck.rows.length > 0) return res.status(400).json({ error: 'Username already taken' });
      const result = await query('UPDATE users SET username = $1 WHERE id = $2 RETURNING id, username, email, role', [username, req.user!.userId]);
      return res.json({ message: 'Profile updated successfully', user: result.rows[0] });
    }

    const users = await jsonStore.getAll('users');
    if (users.some((u: any) => u.username === username && u.id !== req.user!.userId)) return res.status(400).json({ error: 'Username already taken' });
    const updated = await jsonStore.updateById('users', req.user!.userId, { username });
    return res.json({ message: 'Profile updated successfully', user: updated });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

/**
 * PUT /api/user/password
 * Change user's own password
 */
export async function changePassword(req: Request, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password required' });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Get user's current password hash
    let currentHash: string | null = null;
    if (DB_AVAILABLE) {
      const userResult = await query('SELECT password_hash FROM users WHERE id = $1', [req.user!.userId]);
      if (userResult.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      currentHash = userResult.rows[0].password_hash;
    } else {
      const u = await jsonStore.getById('users', req.user!.userId);
      if (!u) return res.status(404).json({ error: 'User not found' });
      currentHash = u.password_hash;
    }

    // Verify current password
    if (!currentHash) {
      // No password hash present for user - treat as error
      return res.status(500).json({ error: 'User has no password set' });
    }
    const isValidPassword = await comparePassword(currentPassword, currentHash);
    if (!isValidPassword) return res.status(401).json({ error: 'Current password is incorrect' });

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    if (DB_AVAILABLE) {
      await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newPasswordHash, req.user!.userId]);
    } else {
      await jsonStore.updateById('users', req.user!.userId, { password_hash: newPasswordHash });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
}

export default {
  updateProfile,
  changePassword,
};
