import { Request, Response } from 'express';
import emailPreviewStore from '../services/emailPreviewStore';

export async function listEmailPreviews(req: Request, res: Response) {
  try {
    const items = await emailPreviewStore.listPreviews();
    res.json(items);
  } catch (e) {
    console.error('Failed to list email previews:', e);
    res.status(500).json({ error: 'Failed to list previews' });
  }
}

export async function getEmailPreview(req: Request, res: Response) {
  const id = req.params.id;
  try {
    const html = await emailPreviewStore.getPreviewHtml(id);
    if (!html) return res.status(404).json({ error: 'Preview not found' });
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (e) {
    console.error('Failed to get email preview:', e);
    res.status(500).json({ error: 'Failed to load preview' });
  }
}

export async function getEmailPreviewMeta(req: Request, res: Response) {
  const id = req.params.id;
  try {
    const meta = await emailPreviewStore.getPreviewMeta(id);
    if (!meta) return res.status(404).json({ error: 'Preview metadata not found' });
    res.json(meta);
  } catch (e) {
    console.error('Failed to get preview meta:', e);
    res.status(500).json({ error: 'Failed to load preview metadata' });
  }
}

export async function deleteEmailPreview(req: Request, res: Response) {
  const id = req.params.id;
  try {
    const ok = await emailPreviewStore.deletePreview(id);
    if (!ok) return res.status(404).json({ error: 'Preview not found' });
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to delete preview:', e);
    res.status(500).json({ error: 'Failed to delete preview' });
  }
}

export default { listEmailPreviews, getEmailPreview, getEmailPreviewMeta, deleteEmailPreview };
