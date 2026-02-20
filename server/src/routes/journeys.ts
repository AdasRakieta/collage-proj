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
import { validate, validateQuery } from '../middleware/validation';
import {
  createJourneySchema,
  updateJourneySchema,
  getJourneysSchema,
  getJourneyByIdSchema,
  deleteJourneySchema,
} from '../schemas/journey.schema';

const router = express.Router();
import { authenticateToken } from '../middleware/auth';

// all journey endpoints require authentication; controllers assume req.user
router.use(authenticateToken);

// Public routes with validation
router.post('/', validate(createJourneySchema), createJourney);
router.get('/', validateQuery(getJourneysSchema), getAllJourneys);
// Export user's journeys as JSON. Optional query `?id=123` to export single journey.
router.get('/export', exportJourneys);
// Import journeys JSON (array of journeys). Server will insert into DB when available.
router.post('/import', importJourneys);
router.get('/shared-with-me', getSharedWithMe);
router.get('/:id', validate(getJourneyByIdSchema), getJourneyById);
router.put('/:id', validate(updateJourneySchema), updateJourney);
router.delete('/:id', validate(deleteJourneySchema), deleteJourney);
router.post('/:id/calculate-cost', validate(getJourneyByIdSchema), calculateTotalCost);
router.post('/:id/share', shareJourney);
router.post('/invitations/accept', acceptInvitation);
router.post('/invitations/:id/reject', rejectInvitation);
// List shares for a journey
router.get('/:id/shares', validate(getJourneyByIdSchema), getSharesForJourney);
// Update a share role
router.put('/:id/shares/:shareId', updateShareRole);
// Remove an existing share (unshare)
router.delete('/:id/shares/:shareId', removeShare);

export default router;
