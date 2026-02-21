import express from 'express';
import { authenticateToken } from '../middleware/auth';
import attachmentController from '../controllers/attachmentController';

const router = express.Router();

// Upload attachment: fields = target ids like journeyId/stopId/transportId
// uploadAttachmentHandler exported as array [authenticateToken, upload.single, handler]
router.post('/', ...(attachmentController.uploadAttachmentHandler as any));
router.get('/journey/:journeyId', authenticateToken, attachmentController.listAttachmentsForJourney);
router.post('/:id/apply', authenticateToken, attachmentController.applyAttachmentToTarget);
router.post('/:id/extract', authenticateToken, attachmentController.extractAttachmentData);
router.get('/:id/view', authenticateToken, attachmentController.previewAttachment);
router.get('/:id/download', authenticateToken, attachmentController.downloadAttachment);
router.delete('/:id', authenticateToken, attachmentController.deleteAttachment);

export default router;
