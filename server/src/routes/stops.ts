import express from 'express';
import {
  getStopsByJourneyId,
  getStopById,
  createStop,
  updateStop,
  deleteStop,
  reverseGeocode,
  scrapeBookingUrl,
} from '../controllers/stopController';
import { validate } from '../middleware/validation';
import { createStopSchema, updateStopSchema } from '../schemas/stop.schema';

const router = express.Router();

// Get all stops for a journey
router.get('/journey/:journeyId', getStopsByJourneyId);

// Get single stop by ID
router.get('/:id', getStopById);

// Create stop for a journey (params + body validation)
router.post('/journey/:journeyId', validate(createStopSchema), createStop);

// Update stop (params + body validation)
router.put('/:id', validate(updateStopSchema), updateStop);

// Delete stop
router.delete('/:id', deleteStop);

// Reverse geocoding - coordinates to address
router.post('/reverse-geocode', reverseGeocode);

// Scrape Booking.com URL
router.post('/scrape-booking', scrapeBookingUrl);

export default router;
