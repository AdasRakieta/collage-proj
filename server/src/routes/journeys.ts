import express from 'express';
import {
  createJourney,
  getAllJourneys,
  exportJourneys,
  importJourneys,
  getJourneyById,
  updateJourney,
  deleteJourney,
  calculateTotalCost,
  shareJourney,
  getSharedWithMe,
  acceptInvitation,
  rejectInvitation,
  getSharesForJourney,
  updateShareRole,
  removeShare,
} from '../controllers/journeyController';
import { authenticateToken } from '../middleware/auth';
import { validate, validateQuery } from '../middleware/validation';
import {
  createJourneySchema,
  updateJourneySchema,
  getJourneysSchema,
  getJourneyByIdSchema,
  deleteJourneySchema,
} from '../schemas/journey.schema';

const router = express.Router();

// Protected routes - require authentication + validation
router.post('/', authenticateToken, validate(createJourneySchema), createJourney);
router.get('/', authenticateToken, validateQuery(getJourneysSchema), getAllJourneys);
// Export user's journeys as JSON. Optional query `?id=123` to export single journey.
router.get('/export', authenticateToken, exportJourneys);
// Import journeys JSON (array of journeys) - requires authenticated user. Server will insert into DB when available.
router.post('/import', authenticateToken, importJourneys);
router.get('/shared-with-me', authenticateToken, getSharedWithMe);
router.get('/:id', authenticateToken, validate(getJourneyByIdSchema), getJourneyById);
router.put('/:id', authenticateToken, validate(updateJourneySchema), updateJourney);
router.delete('/:id', authenticateToken, validate(deleteJourneySchema), deleteJourney);
router.post('/:id/calculate-cost', authenticateToken, validate(getJourneyByIdSchema), calculateTotalCost);
router.post('/:id/share', authenticateToken, shareJourney);
router.post('/invitations/accept', authenticateToken, acceptInvitation);
router.post('/invitations/:id/reject', authenticateToken, rejectInvitation);
// List shares for a journey
router.get('/:id/shares', authenticateToken, validate(getJourneyByIdSchema), getSharesForJourney);
// Update a share role
router.put('/:id/shares/:shareId', authenticateToken, updateShareRole);
// Remove an existing share (unshare)
router.delete('/:id/shares/:shareId', authenticateToken, removeShare);

export default router;
