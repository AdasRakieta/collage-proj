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
import { validate } from '../middleware/validation';
import {
  createAttractionSchema,
  updateAttractionSchema,
  getAttractionsByStopIdSchema,
  deleteAttractionSchema,
} from '../schemas/attraction.schema';

const router = express.Router();

// Get all attractions for a stop
router.get('/stop/:stopId', validate(getAttractionsByStopIdSchema), getAttractionsByStopId);

// Create attraction for a stop
router.post('/stop/:stopId', validate(createAttractionSchema), createAttraction);

// Update attraction
router.put('/:id', validate(updateAttractionSchema), updateAttraction);

// Reorder attractions within a stop
router.patch('/stop/:stopId/reorder', reorderAttractions);

// Bulk update attractions (order, priority, dates, move between stops)
router.patch('/bulk', bulkUpdateAttractions);

// Move attraction to another stop
router.patch('/:id/move', moveAttraction);

// Update attraction priority
router.patch('/:id/priority', updateAttractionPriority);

// Delete attraction
router.delete('/:id', validate(deleteAttractionSchema), deleteAttraction);

export default router;
