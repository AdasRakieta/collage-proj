import { Router } from 'express';
import {
  getAllJourneys,
  getJourneyById,
  createJourney,
  updateJourney,
  deleteJourney,
  getTotalCost
} from '../controllers/journeyController_simple';

const router = Router();

router.get('/', getAllJourneys);
router.get('/:id', getJourneyById);
router.post('/', createJourney);
router.put('/:id', updateJourney);
router.delete('/:id', deleteJourney);
router.get('/:id/total-cost', getTotalCost);

export default router;
