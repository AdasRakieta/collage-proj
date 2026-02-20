import express from 'express';
import {
  inviteUser,
  getAllUsers,
  deleteUser,
  changeUserRole,
  toggleUserActive,
  getPendingInvitations,
  cancelInvitation,
} from '../controllers/adminController';
import {
  listEmailPreviews,
  getEmailPreview,
  getEmailPreviewMeta,
  deleteEmailPreview,
} from '../controllers/emailPreviewController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// User management
router.post('/invite', inviteUser);
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/role', changeUserRole);
router.put('/users/:id/toggle-active', toggleUserActive);

// Invitation management
router.get('/invitations', getPendingInvitations);
router.delete('/invitations/:id', cancelInvitation);

// Registration requests (from social / google registration flow)
import { getRegistrationRequests, approveRegistrationRequest, rejectRegistrationRequest } from '../controllers/adminController';
router.get('/registration_requests', getRegistrationRequests);
router.post('/registration_requests/:id/approve', approveRegistrationRequest);
router.post('/registration_requests/:id/reject', rejectRegistrationRequest);

// Email preview routes (admin only)
router.get('/email-previews', listEmailPreviews);
router.get('/email-previews/:id', getEmailPreview);
router.get('/email-previews/:id/meta', getEmailPreviewMeta);
router.delete('/email-previews/:id', deleteEmailPreview);

export default router;
