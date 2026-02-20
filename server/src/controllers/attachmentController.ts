import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { Attachment } from '../models/Attachment';
import jsonStore from '../config/jsonStore';
import { DB_AVAILABLE } from '../config/db';
// Transport import not needed here
import { encryptFile, decryptFileToStream } from '../utils/fileCrypto';
import { parsePdfForFlightAndPrice, autoAssignToTransportIfFlightMatches, parseDocxForFlightAndPrice, docxToHtml, sanitizeHtml } from '../services/attachmentParser';
import { authenticateToken } from '../middleware/auth';
import { query } from '../config/db';

// Helper to convert snake_case JSON to camelCase to keep API consistent with DB objects
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(item => toCamelCase(item));
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = obj[key];
      if (value instanceof Date) {
        if (/(_date)$/.test(key)) acc[camelKey] = value.toISOString().slice(0, 10);
        else acc[camelKey] = value.toISOString();
      }
      else acc[camelKey] = toCamelCase(value);
      return acc;
    }, {});
  }
  return obj;
};

const uploadDir = process.env.UPLOAD_DIR || '/app/uploads/attachments';
const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req: any, file: any, cb: any) => {
    const uid = (process.env.NODE_ENV === 'test') ? Date.now() : crypto.randomUUID();
    cb(null, `${uid}-${file.originalname}`);
  }
});

const upload = multer({ storage, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) } });

export const uploadAttachmentHandler = [
  authenticateToken,
  upload.single('file'),
  async (req: any, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'File is required' });

      // If DB is not available, persist to JSON store instead
      const { journeyId, stopId, transportId } = req.body;

      // Normalize filename encoding: some clients or previous imports may produce mojibake
      const normalizeFilename = (n: any) => {
        if (!n || typeof n !== 'string') return n;
        // Common mojibake indicators: Ã, Â, Å
        if (/Ã|Â|Å/.test(n)) {
          try {
            // Interpret the received string as latin1 and convert to utf8
            const fixed = Buffer.from(n, 'latin1').toString('utf8');
            return fixed;
          } catch (e) {
            return n;
          }
        }
        return n;
      };

      const originalFilename = normalizeFilename(req.file.originalname);
      const filePath = req.file.path;
      const destFilename = `${req.file.filename}.enc`;
      const destPath = path.join(uploadDir, destFilename);

      // NOTE: We intentionally do not auto-parse or auto-assign on upload.
      // Parsing/extraction should be triggered manually via the /attachments/:id/extract endpoint.

      // Encrypt file
      const { iv, authTag } = await encryptFile(filePath, destPath);

      // Remove original plain file after encryption
      fs.unlinkSync(filePath);
      if (!DB_AVAILABLE) {
        // Save metadata in JSON store
        const newAttach = await jsonStore.insert('attachments', {
          journey_id: journeyId ? Number(journeyId) : null,
          stop_id: stopId ? Number(stopId) : null,
          transport_id: transportId ? Number(transportId) : null,
          filename: destFilename,
          original_filename: originalFilename,
          file_path: destPath,
          file_size: req.file.size,
          mime_type: req.file.mimetype,
          uploaded_by: (req as any).user?.userId || null,
          is_encrypted: true,
          iv,
          auth_tag: authTag,
          created_at: new Date().toISOString(),
        });

        return res.status(201).json({ attachment: toCamelCase(newAttach) });
      }

      // Persist metadata to DB

      // Save metadata
      const attachment = await Attachment.create({
        journeyId: journeyId || null,
        stopId: stopId || null,
        transportId: transportId || null,
        filename: destFilename,
        originalFilename,
        filePath: destPath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: (req as any).user?.userId || null,
        isEncrypted: true,
        iv,
        authTag
      });

      // No auto-parsing or assignment here; extraction is manual.

      res.status(201).json({ attachment: attachment.toJSON() });
    } catch (err) {
      console.error('File upload error', err);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  }
];

export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) {
      attachment = await jsonStore.getById('attachments', id);
    } else {
      attachment = await Attachment.findByPk(id);
    }
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Check permissions: uploader or shared users
    const userId = (req as any).user?.userId;
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      // Allow access to any user the journey is shared with (presence of a journey_shares row).
      if (!checkAttachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted');
        if (!found) {
          console.warn(`Download access denied: user ${userId} not permitted for attachment ${id} (journey ${checkAttachment.journeyId})`);
          return res.status(403).json({ message: 'Access denied' });
        }
      } else {
        const shareRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3', [checkAttachment.journeyId, userId, 'accepted']);
        if (!shareRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    const filePath = (!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath;
    const iv = (!DB_AVAILABLE) ? checkAttachment.iv : attachment.iv;
    const authTag = (!DB_AVAILABLE) ? checkAttachment.authTag : attachment.authTag;

    const inline = req.query.inline === '1' || req.query.inline === 'true';
    const readStream = decryptFileToStream(filePath, iv || '', authTag || '');
    // Support UTF-8 filenames in Content-Disposition using RFC 5987 (filename*)
    const filename = (checkAttachment.originalFilename || checkAttachment.filename || 'attachment').toString();
    const safeFilename = filename.replace(/\"/g, '');
    const disposition = `${inline ? 'inline' : 'attachment'}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
    res.setHeader('Content-Disposition', disposition);
    res.setHeader('Content-Type', checkAttachment.mimeType || 'application/octet-stream');
    readStream.pipe(res);
  } catch (err) {
    console.error('Download error', err);
    res.status(500).json({ message: 'Failed to download' });
  }
};

// NOTE: extractAttachmentData provides the extraction via decryption to temp and parsing.

export const previewAttachment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) attachment = await jsonStore.getById('attachments', id);
    else attachment = await Attachment.findByPk(id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });
    const check = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;

    const userId = (req as any).user?.userId;
    if (check.uploadedBy !== userId) {
      // Allow users who have the journey shared with them to preview
      if (!check.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', check.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3', [check.journeyId, userId, 'accepted']);
        if (!sRes.rows.length) {
          console.warn(`Preview access denied: user ${userId} not permitted for attachment ${id} (journey ${check.journeyId})`);
          return res.status(403).json({ message: 'Access denied' });
        }
      }
    }

    const filePath = check.filePath;
    const mime = check.mimeType || '';
    if (mime.includes('pdf')) {
      return res.json({ type: 'pdf', url: `/api/attachments/${id}/download?inline=1` });
    }
    if (mime.includes('officedocument') || mime.includes('msword') || mime.includes('word')) {
      // Decrypt DOCX to a temp file before converting to HTML (docx is a ZIP archive)
      const tempPath = path.join(uploadDir, `temp-${crypto.randomUUID()}${path.extname(check.filename || check.filePath || '') || ''}`);
      const stream = decryptFileToStream((!DB_AVAILABLE) ? check.filePath : attachment.filePath, check.iv || attachment.iv || '', check.authTag || attachment.authTag || check.auth_tag || '');
      await new Promise((resolve, reject) => {
        const out = fs.createWriteStream(tempPath);
        stream.pipe(out);
        out.on('finish', () => resolve(undefined));
        out.on('error', reject);
      });

      try {
        const htmlRaw = await docxToHtml(tempPath);
        const html = sanitizeHtml(htmlRaw);
        try { fs.unlinkSync(tempPath); } catch (e) {}
        return res.json({ type: 'docx', html });
      } catch (e) {
        try { fs.unlinkSync(tempPath); } catch (er) {}
        throw e;
      }
    }
    res.status(400).json({ message: 'Preview not available' });
  } catch (err) {
    console.error('Preview error', err);
    res.status(500).json({ message: 'Failed to preview' });
  }
};

export const deleteAttachment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) {
      attachment = await jsonStore.getById('attachments', id);
    } else {
      attachment = await Attachment.findByPk(id);
    }
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    const userId = (req as any).user?.userId;
    // Only uploader or journey owner or manager role can delete
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      // check if user has manage rights
      if (!attachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted' && s.role === 'manage');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3 AND role = $4', [attachment.journeyId, userId, 'accepted', 'manage']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    // delete file on disk
    const filePath = (!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (!DB_AVAILABLE) {
      await jsonStore.deleteById('attachments', checkAttachment.id);
    } else {
      await attachment.destroy();
    }
    res.json({ message: 'Attachment deleted' });
  } catch (err) {
    console.error('Delete attachment error', err);
    res.status(500).json({ message: 'Failed to delete attachment' });
  }
};

export const listAttachmentsForJourney = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    if (!DB_AVAILABLE) {
      // For JSON store, gather attachments with journey_id, or transport_id/stop_id that belong to this journey
      const transports = await jsonStore.findByField('transports', 'journey_id', journeyId);
      const stops = await jsonStore.findByField('stops', 'journey_id', journeyId);
      const transportIds = transports.map((t: any) => t.id);
      const stopIds = stops.map((s: any) => s.id);
      const allAttachments = await jsonStore.getAll('attachments');
      const attachmentsByJourney = allAttachments.filter((a: any) => Number(a.journey_id) === journeyId);
      const attachmentsByTransport = transportIds.length ? allAttachments.filter((a: any) => transportIds.includes(Number(a.transport_id))) : [];
      const attachmentsByStop = stopIds.length ? allAttachments.filter((a: any) => stopIds.includes(Number(a.stop_id))) : [];
      const all = [...attachmentsByJourney, ...attachmentsByTransport, ...attachmentsByStop];
      // Deduplicate by id
      const uniq = Array.from(new Map(all.map((a: any) => [a.id, a])).values());
      // Normalize numeric ID types for JSON store (may be strings)
      const normalized = uniq.map((a: any) => ({
        ...a,
        journey_id: a.journey_id != null ? Number(a.journey_id) : null,
        transport_id: a.transport_id != null ? Number(a.transport_id) : null,
        stop_id: a.stop_id != null ? Number(a.stop_id) : null
      }));
      return res.json(toCamelCase(normalized));
    }

    // For DB-backed store, pick attachments where journeyId === $1 OR transport belongs to journey OR stop belongs to journey
    const rows = await query(`
      SELECT a.* FROM attachments a
      LEFT JOIN transports t ON a.transport_id = t.id
      LEFT JOIN stops s ON a.stop_id = s.id
      WHERE a.journey_id = $1 OR (t.journey_id = $1) OR (s.journey_id = $1)
    `, [journeyId]);
    res.json(rows.rows.map((r: any) => toCamelCase(r)));
  } catch (err) {
    console.error('List attachments', err);
    res.status(500).json({ message: 'Failed to fetch attachments' });
  }
};

export const applyAttachmentToTarget = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { targetType, targetId } = req.body;
    let attachment: any = null;
    if (!DB_AVAILABLE) {
      attachment = await jsonStore.getById('attachments', id);
    } else {
      attachment = await Attachment.findByPk(id);
    }
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Check permission - user must be uploader or have manage rights
    const userId = (req as any).user?.userId;
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      if (!attachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted' && s.role === 'manage');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3 AND role = $4', [attachment.journeyId, userId, 'accepted', 'manage']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Acceptable target types: transport, stop, journey
    if (targetType === 'transport') {
      // Ensure we set both transportId and journeyId so journey-based listing picks it up
      if (!DB_AVAILABLE) {
      attachment.transport_id = Number(targetId);
        // Lookup transport in JSON store to find journey id
        const transport = await jsonStore.getById('transports', targetId);
        if (transport && transport.journey_id) attachment.journey_id = transport.journey_id;
      } else {
        attachment.transportId = targetId;
        // Lookup transport to derive journey id
        try {
          const tr = await query('SELECT journey_id FROM transports WHERE id = $1', [targetId]);
          if (tr && tr.rows && tr.rows.length) {
            const journeyIdFound = tr.rows[0].journey_id;
            attachment.journeyId = journeyIdFound;
          }
        } catch (e) {
          console.warn('Failed to lookup transport for attachment apply: ', e);
        }
      }
    } else if (targetType === 'stop') {
      // Ensure we set both stopId and journeyId so journey-based listing picks it up
      if (!DB_AVAILABLE) {
      attachment.stop_id = Number(targetId);
        const stop = await jsonStore.getById('stops', targetId);
        if (stop && stop.journey_id) attachment.journey_id = stop.journey_id;
      } else {
        attachment.stopId = targetId;
        try {
          const s = await query('SELECT journey_id FROM stops WHERE id = $1', [targetId]);
          if (s && s.rows && s.rows.length) {
            const journeyIdFound = s.rows[0].journey_id;
            attachment.journeyId = journeyIdFound;
          }
        } catch (e) {
          console.warn('Failed to lookup stop for attachment apply: ', e);
        }
      }
    } else if (targetType === 'journey') {
      if (!DB_AVAILABLE) attachment.journey_id = targetId;
      else attachment.journeyId = targetId;
    } else {
      return res.status(400).json({ message: 'Invalid target type' });
    }
    if (!DB_AVAILABLE) {
      await jsonStore.updateById('attachments', attachment.id, attachment);
    } else {
      await attachment.save();
    }
    const io = req.app.get('io');
    io.emit('attachment:applied', { attachmentId: attachment.id, targetType, targetId });
    if (!DB_AVAILABLE) {
      const normalized = { ...attachment, journey_id: attachment.journey_id != null ? Number(attachment.journey_id) : null, transport_id: attachment.transport_id != null ? Number(attachment.transport_id) : null, stop_id: attachment.stop_id != null ? Number(attachment.stop_id) : null };
      return res.json(toCamelCase(normalized));
    }
    return res.json(attachment);
  } catch (err) {
    console.error('Apply attach error', err);
    res.status(500).json({ message: 'Failed to apply attachment' });
  }
};

export const extractAttachmentData = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) attachment = await jsonStore.getById('attachments', id);
    else attachment = await Attachment.findByPk(id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Permission check (uploader or shared)
    const userId = (req as any).user?.userId;
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      // Allow extract for any user the journey is shared with
      if (!checkAttachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3', [checkAttachment.journeyId, userId, 'accepted']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    const mime = checkAttachment.mimeType || checkAttachment.mime_type || '';
    // Only support extraction for PDFs and docx
    if (!mime.includes('pdf') && !mime.includes('word') && !mime.includes('officedocument')) {
      return res.status(400).json({ message: 'Extraction supported only for PDF and DOCX files' });
    }

    const tempPath = path.join(uploadDir, `temp-${crypto.randomUUID()}${path.extname(checkAttachment.filename || checkAttachment.filePath || '') || ''}`);
    // decrypt to temp
    const stream = decryptFileToStream((!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath, checkAttachment.iv || '', checkAttachment.authTag || checkAttachment.auth_tag || '');
    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(tempPath);
      stream.pipe(out);
      out.on('finish', () => resolve(undefined));
      out.on('error', reject);
    });

    let parsed: any = null;
    if (mime.includes('pdf')) {
      parsed = await parsePdfForFlightAndPrice(tempPath);
    } else {
      // docx
      parsed = await parseDocxForFlightAndPrice(tempPath);
    }

    // clean up temp
    try { fs.unlinkSync(tempPath); } catch (e) {}

    // Persist parsed results to attachment parsed_json
    if (!DB_AVAILABLE) {
      attachment.parsed_json = parsed;
      await jsonStore.updateById('attachments', attachment.id, attachment);
    } else {
      attachment.parsedJson = parsed;
      await attachment.save();
    }

    // If assign query param present, try to auto-assign to transport with matching flight number
    const assign = (req.query.assign === '1' || req.query.assign === 'true' || req.body?.assign === true);
    let assignedTransport: any = null;
    if (assign && parsed?.flightNumber && checkAttachment.journeyId) {
      const matched = await autoAssignToTransportIfFlightMatches(checkAttachment.journeyId, parsed.flightNumber);
      if (matched) {
          if (!DB_AVAILABLE) {
          attachment.transport_id = Number(matched.id);
          await jsonStore.updateById('attachments', attachment.id, attachment);
        } else {
          attachment.transportId = matched.id;
          await attachment.save();
        }
        assignedTransport = matched;
        const io = req.app.get('io');
        io.emit('attachment:applied', { attachmentId: attachment.id, targetType: 'transport', targetId: matched.id, byAutoAssign: true });
      }
    }

    return res.json({ parsed, assignedTransport });
  } catch (err) {
    console.error('Extract error', err);
    res.status(500).json({ message: 'Failed to extract data' });
  }
};

export const viewAttachment = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    let attachment: any = null;
    if (!DB_AVAILABLE) attachment = await jsonStore.getById('attachments', id);
    else attachment = await Attachment.findByPk(id);
    if (!attachment) return res.status(404).json({ message: 'Attachment not found' });

    // Permission: same as download
    const userId = (req as any).user?.userId;
    const checkAttachment = (!DB_AVAILABLE) ? toCamelCase(attachment) : attachment;
    if (checkAttachment.uploadedBy !== userId) {
      if (!checkAttachment.journeyId) return res.status(403).json({ message: 'Access denied' });
      if (!DB_AVAILABLE) {
        const shares = await jsonStore.findByField('journey_shares', 'journey_id', checkAttachment.journeyId);
        const found = shares.find((s: any) => s.shared_with_user_id === userId && s.status === 'accepted');
        if (!found) return res.status(403).json({ message: 'Access denied' });
      } else {
        const sRes = await query('SELECT * FROM journey_shares WHERE journey_id = $1 AND shared_with_user_id = $2 AND status = $3', [checkAttachment.journeyId, userId, 'accepted']);
        if (!sRes.rows.length) return res.status(403).json({ message: 'Access denied' });
      }
    }

    const mime = checkAttachment.mimeType || checkAttachment.mime_type || '';
    if (mime.includes('pdf')) {
      const filePath = (!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath;
      const iv = checkAttachment.iv || attachment.iv || '';
      const authTag = checkAttachment.authTag || attachment.authTag || checkAttachment.auth_tag || '';
      const readStream = decryptFileToStream(filePath, iv, authTag);
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('Content-Type', 'application/pdf');
      return readStream.pipe(res);
    }

    if (mime.includes('officedocument') || mime.includes('word')) {
      // decrypt to temp and convert to HTML
      const tempPath = path.join(uploadDir, `temp-${crypto.randomUUID()}${path.extname(checkAttachment.filename || checkAttachment.filePath || '') || ''}`);
      const stream = decryptFileToStream((!DB_AVAILABLE) ? checkAttachment.filePath : attachment.filePath, checkAttachment.iv || '', checkAttachment.authTag || checkAttachment.auth_tag || '');
      await new Promise((resolve, reject) => {
          const out = fs.createWriteStream(tempPath);
          stream.pipe(out);
          out.on('finish', () => resolve(undefined));
          out.on('error', reject);
        });

      const htmlRaw = await docxToHtml(tempPath);
      const html = sanitizeHtml(htmlRaw);
      try { fs.unlinkSync(tempPath); } catch (e) {}
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    return res.status(400).json({ message: 'Unsupported file type for preview' });
  } catch (err) {
    console.error('View attachment error', err);
    res.status(500).json({ message: 'Failed to render attachment' });
  }
};

export default {
  uploadAttachmentHandler,
  downloadAttachment,
  deleteAttachment,
  listAttachmentsForJourney,
    applyAttachmentToTarget,
    extractAttachmentData,
    viewAttachment,
    previewAttachment
};
