import fs from 'fs/promises';
import path from 'path';

const PREVIEW_DIR = path.resolve(__dirname, '../../data/email_previews');

export interface EmailPreviewMeta {
  id: string;
  to: string;
  subject: string;
  timestamp: string; // ISO
  filenameHtml: string;
  filenameMeta: string;
}

async function ensureDir() {
  try {
    await fs.mkdir(PREVIEW_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export async function savePreview(opts: { to: string; subject: string; html: string; text?: string; }): Promise<string> {
  await ensureDir();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const filenameHtml = `${id}.html`;
  const filenameMeta = `${id}.json`;
  const meta: EmailPreviewMeta = {
    id,
    to: opts.to,
    subject: opts.subject,
    timestamp: new Date().toISOString(),
    filenameHtml,
    filenameMeta,
  };

  try {
    await fs.writeFile(path.join(PREVIEW_DIR, filenameHtml), opts.html, 'utf-8');
    await fs.writeFile(path.join(PREVIEW_DIR, filenameMeta), JSON.stringify({ ...meta, text: opts.text || '' }, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save email preview:', e);
  }

  return id;
}

export async function listPreviews(): Promise<EmailPreviewMeta[]> {
  await ensureDir();
  try {
    const files = await fs.readdir(PREVIEW_DIR);
    const metas = files.filter(f => f.endsWith('.json'));
    const results: EmailPreviewMeta[] = [];
    for (const m of metas) {
      try {
        const content = await fs.readFile(path.join(PREVIEW_DIR, m), 'utf-8');
        const parsed = JSON.parse(content) as any;
        results.push({
          id: parsed.id,
          to: parsed.to,
          subject: parsed.subject,
          timestamp: parsed.timestamp,
          filenameHtml: parsed.filenameHtml,
          filenameMeta: m,
        });
      } catch (e) {
        // ignore individual parse errors
      }
    }
    // newest first
    results.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return results;
  } catch (e) {
    console.error('Failed to list email previews:', e);
    return [];
  }
}

export async function getPreviewHtml(id: string): Promise<string | null> {
  await ensureDir();
  const filename = `${id}.html`;
  try {
    const content = await fs.readFile(path.join(PREVIEW_DIR, filename), 'utf-8');
    return content;
  } catch (e) {
    return null;
  }
}

export async function getPreviewMeta(id: string): Promise<any | null> {
  await ensureDir();
  const filename = `${id}.json`;
  try {
    const content = await fs.readFile(path.join(PREVIEW_DIR, filename), 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

export async function deletePreview(id: string): Promise<boolean> {
  await ensureDir();
  try {
    await fs.unlink(path.join(PREVIEW_DIR, `${id}.html`));
    await fs.unlink(path.join(PREVIEW_DIR, `${id}.json`));
    return true;
  } catch (e) {
    return false;
  }
}

export default { savePreview, listPreviews, getPreviewHtml, getPreviewMeta, deletePreview };
