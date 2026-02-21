import fs from 'fs';
// pdf-parse has no official TypeScript declarations; use require to avoid compile-time error
// We add a local shim in src/types/pdf-parse.d.ts to improve type hints later.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf: any = require('pdf-parse');
import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';
import path from 'path';
import mammoth from 'mammoth';
// Cheerio may be imported differently depending on module resolution; use require for runtime compatibility
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cheerio: any = require('cheerio');

export interface ParsedAttachmentResult {
  flightNumber?: string;
  price?: { amount: number, currency?: string } | null;
  matches: string[];
}

export const parsePdfForFlightAndPrice = async (filePath: string): Promise<ParsedAttachmentResult> => {
  const buffer = fs.readFileSync(filePath);
  const data = await pdf(buffer);
  const text = data.text || '';

  const matches: string[] = [];
  const result: ParsedAttachmentResult = { matches };

  // Flight number: two letters + digits, e.g. LO123, BA 876
  const flightRegex = /\b([A-Z]{2}\s?\d{1,6})\b/g;
  const flightMatch = flightRegex.exec(text);
  if (flightMatch) {
    result.flightNumber = flightMatch[1].replace(/\s+/g, '');
    matches.push(result.flightNumber);
  }

  // Price: match numbers with currency (common currencies)
  const priceRegex = /(\d{1,3}(?:[.,]\d{2})?)\s?(EUR|USD|PLN|GBP)?/g;
  let priceMatch;
  while ((priceMatch = priceRegex.exec(text)) !== null) {
    const amountStr = priceMatch[1].replace(/,/g, '.');
    const amount = parseFloat(amountStr);
    if (amount > 0) {
      result.price = { amount, currency: priceMatch[2] || undefined };
      matches.push(`${amount} ${priceMatch[2] || ''}`.trim());
      break;
    }
  }

  return result;
};

export const parseTextForFlightAndPrice = (text: string): ParsedAttachmentResult => {
  const matches: string[] = [];
  const result: ParsedAttachmentResult = { matches };

  // Flight number: two letters + digits, e.g. LO123, BA 876
  const flightRegex = /\b([A-Z]{2}\s?\d{1,6})\b/g;
  const flightMatch = flightRegex.exec(text);
  if (flightMatch) {
    result.flightNumber = flightMatch[1].replace(/\s+/g, '');
    matches.push(result.flightNumber);
  }

  // Price: match numbers with currency (common currencies)
  const priceRegex = /(\d{1,3}(?:[.,]\d{2})?)\s?(EUR|USD|PLN|GBP)?/g;
  let priceMatch;
  while ((priceMatch = priceRegex.exec(text)) !== null) {
    const amountStr = priceMatch[1].replace(/,/g, '.');
    const amount = parseFloat(amountStr);
    if (amount > 0) {
      result.price = { amount, currency: priceMatch[2] || undefined };
      matches.push(`${amount} ${priceMatch[2] || ''}`.trim());
      break;
    }
  }

  return result;
};

export const parseDocxForFlightAndPrice = async (filePath: string): Promise<ParsedAttachmentResult> => {
  const out = await mammoth.extractRawText({ path: filePath });
  const text = out.value || '';
  return parseTextForFlightAndPrice(text);
};

export const docxToHtml = async (filePath: string): Promise<string> => {
  const out = await mammoth.convertToHtml({ path: filePath });
  return out.value || '';
};

export const sanitizeHtml = (html: string): string => {
  const $ = cheerio.load(html, { xmlMode: false });
  // Remove script/style tags
  $('script, style').remove();
  // Remove event handler attributes and javascript: URIs
  $('*').each((i: number, el: any) => {
    const attribs: Record<string, string> = (el && el.attribs) || {};
    Object.keys(attribs).forEach(attr => {
      if (attr.toLowerCase().startsWith('on')) {
        $(el).removeAttr(attr);
      }
      const val = attribs[attr] || '';
      if (typeof val === 'string' && val.trim().toLowerCase().startsWith('javascript:')) {
        $(el).removeAttr(attr);
      }
    });
  });
  return $.html();
};

export const autoAssignToTransportIfFlightMatches = async (journeyId: number, flightNumber?: string) => {
  if (!flightNumber) return null;
  // Search for transport with this flight number in the given journey
  if (!DB_AVAILABLE) {
    const transports = await jsonStore.findByField('transports', 'journey_id', journeyId);
    const matched = transports.find((t: any) => (t.flight_number || '').toLowerCase().includes((flightNumber || '').toLowerCase()));
    return matched || null;
  }

  const q = 'SELECT * FROM transports WHERE journey_id = $1 AND (flight_number = $2 OR flight_number ILIKE $3) LIMIT 1';
  const r = await query(q, [journeyId, flightNumber, `%${flightNumber}%`]);
  return r.rows[0];
};
