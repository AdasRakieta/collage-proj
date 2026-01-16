import express from 'express';
import {
  getTransportsByJourneyId,
  createTransport,
  updateTransport,
  deleteTransport,
  scrapeTicket,
} from '../controllers/transportController';
import { validate } from '../middleware/validation';
import { createTransportSchema, updateTransportSchema } from '../schemas/transport.schema';

const router = express.Router();

// Routes are mounted at /api/transports
router.get('/journey/:journeyId', getTransportsByJourneyId);
router.post('/journey/:journeyId', validate(createTransportSchema), createTransport);
router.put('/:id', validate(updateTransportSchema), updateTransport);
router.delete('/:id', deleteTransport);
router.post('/scrape-ticket', scrapeTicket);

export default router;
