import express from 'express';
import { updateProfile, changePassword } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All user routes require authentication
router.use(authenticateToken);

router.put('/profile', updateProfile);
router.put('/password', changePassword);

export default router;
