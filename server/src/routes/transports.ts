import express from 'express';
import {
  getTransportsByJourneyId,
  createTransport,
  updateTransport,
  deleteTransport,
  scrapeTicket,
} from '../controllers/transportController';
import { authenticateToken } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { createTransportSchema, updateTransportSchema } from '../schemas/transport.schema';

const router = express.Router();

// Routes are mounted at /api/transports
router.get('/journey/:journeyId', authenticateToken, getTransportsByJourneyId);
router.post('/journey/:journeyId', authenticateToken, validate(createTransportSchema), createTransport);
router.put('/:id', authenticateToken, validate(updateTransportSchema), updateTransport);
router.delete('/:id', authenticateToken, deleteTransport);
router.post('/scrape-ticket', authenticateToken, scrapeTicket);

export default router;
