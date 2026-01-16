import express from 'express';
import {
  getAttractionsByStopId,
  createAttraction,
  updateAttraction,
  deleteAttraction,
  reorderAttractions,
  moveAttraction,
  updateAttractionPriority,
  bulkUpdateAttractions,
} from '../controllers/attractionController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createAttractionSchema,
  updateAttractionSchema,
  getAttractionsByStopIdSchema,
  deleteAttractionSchema,
} from '../schemas/attraction.schema';

const router = express.Router();

// Get all attractions for a stop
router.get('/stop/:stopId', authenticateToken, validate(getAttractionsByStopIdSchema), getAttractionsByStopId);

// Create attraction for a stop
router.post('/stop/:stopId', authenticateToken, validate(createAttractionSchema), createAttraction);

// Update attraction
router.put('/:id', authenticateToken, validate(updateAttractionSchema), updateAttraction);

// Reorder attractions within a stop
router.patch('/stop/:stopId/reorder', authenticateToken, reorderAttractions);

// Bulk update attractions (order, priority, dates, move between stops)
router.patch('/bulk', authenticateToken, bulkUpdateAttractions);

// Move attraction to another stop
router.patch('/:id/move', authenticateToken, moveAttraction);

// Update attraction priority
router.patch('/:id/priority', authenticateToken, updateAttractionPriority);

// Delete attraction
router.delete('/:id', authenticateToken, validate(deleteAttractionSchema), deleteAttraction);

export default router;
