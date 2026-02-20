import { Request, Response } from 'express';
import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { computeAndPersistTotal } from '../services/journeyService';

// Helper function to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  // Keep Date objects as ISO strings
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = obj[key];
      
      // Convert Date objects: date-only fields -> YYYY-MM-DD, otherwise keep full ISO
      if (value instanceof Date) {
        if (/(_date)$/.test(key)) {
          acc[camelKey] = value.toISOString().slice(0, 10);
        } else {
          acc[camelKey] = value.toISOString();
        }
      }
      // Convert numeric strings to numbers for specific fields
      else if (typeof value === 'string' && 
               (key.includes('price') || key.includes('cost') || 
                key === 'latitude' || key === 'longitude') &&
               /^-?\d+(\.\d+)?$/.test(value)) {
        acc[camelKey] = parseFloat(value);
      }
      else {
        acc[camelKey] = toCamelCase(value);
      }
      
      return acc;
    }, {} as any);
  }
  return obj;
};

// Get all stops for a journey
export const getStopsByJourneyId = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const page = parseInt((req.query.page as string) || '1');
    const pageSize = parseInt((req.query.pageSize as string) || '25');
    const q = (req.query.q as string || '').trim();
    if (!DB_AVAILABLE) {
      const stops = (await jsonStore.findByField('stops', 'journey_id', journeyId))
        .sort((a: any, b: any) => (new Date(a.arrival_date || 0).getTime()) - (new Date(b.arrival_date || 0).getTime()));
      let filtered = stops;
      if (q) filtered = filtered.filter((s: any) => ((s.city || '') + ' ' + (s.country || '')).toLowerCase().includes(q.toLowerCase()));
      const start = (page - 1) * pageSize;
      const paged = filtered.slice(start, start + pageSize);
      return res.json(toCamelCase(paged));
    }
    let baseQuery = 'SELECT * FROM stops WHERE journey_id=$1';
    const params: any[] = [journeyId];
    if (q) { baseQuery += ` AND (city ILIKE $${params.length + 1} OR country ILIKE $${params.length + 1})`; params.push(`%${q}%`); }
    baseQuery += ' ORDER BY arrival_date ASC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(pageSize, (page - 1) * pageSize);
    const result = await query(baseQuery, params);
    res.json(toCamelCase(result.rows));
  } catch (error) {
    console.error('Error fetching stops:', error);
    res.status(500).json({ message: 'Failed to fetch stops' });
  }
};

// Get single stop by ID
export const getStopById = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.id);
    if (!DB_AVAILABLE) {
      const stop = await jsonStore.getById('stops', stopId);
      if (!stop) return res.status(404).json({ message: 'Stop not found' });
      return res.json(toCamelCase(stop));
    }
    const result = await query('SELECT * FROM stops WHERE id=$1', [stopId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Stop not found' });
    }
    res.json(toCamelCase(result.rows[0]));
  } catch (error) {
    console.error('Error fetching stop:', error);
    res.status(500).json({ message: 'Failed to fetch stop' });
  }
};

// Create stop
export const createStop = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const {
      city,
      country,
      latitude,
      longitude,
      arrivalDate,
      departureDate,
      accommodationName,
      accommodationUrl,
      accommodationPrice,
      accommodationCurrency,
      notes,
      checkInTime,
      checkOutTime
    } = req.body;
    let { addressStreet, addressHouseNumber, postalCode } = req.body;
    if (addressStreet === '' || addressStreet === undefined) addressStreet = null;
    if (addressHouseNumber === '' || addressHouseNumber === undefined) addressHouseNumber = null;
    if (postalCode === '' || postalCode === undefined) postalCode = null;
    
    if (!DB_AVAILABLE) {
      if (addressStreet === '' || addressStreet === undefined) addressStreet = null;
      if (addressHouseNumber === '' || addressHouseNumber === undefined) addressHouseNumber = null;
      if (postalCode === '' || postalCode === undefined) postalCode = null;
      // Auto-mark as paid if accommodation price is 0 or null
      const isPaid = !accommodationPrice || accommodationPrice === 0;
      const newStop = await jsonStore.insert('stops', {
        journey_id: journeyId,
        city, country, latitude, longitude,
        arrival_date: arrivalDate, departure_date: departureDate,
        address_street: addressStreet, address_house_number: addressHouseNumber, address_postal_code: postalCode,
        accommodation_name: accommodationName, accommodation_url: accommodationUrl,
        accommodation_price: accommodationPrice, accommodation_currency: accommodationCurrency,
        notes, check_in_time: checkInTime || null, check_out_time: checkOutTime || null,
        is_paid: isPaid,
        created_at: new Date().toISOString()
      });
      const stop = toCamelCase(newStop);
      const io = req.app.get('io');
      io.emit('stop:created', stop);
      // Recompute journey total and emit updated journey
      try {
        await computeAndPersistTotal(journeyId);
        const journey = toCamelCase(await jsonStore.getById('journeys', journeyId));
        io.emit('journey:updated', journey);
      } catch (e) {
        console.warn('Failed to recompute total after stop create (JSON):', e);
      }
      return res.status(201).json(stop);
    }
    // Auto-mark as paid if accommodation price is 0 or null
    const isPaid = !accommodationPrice || accommodationPrice === 0;
    const result = await query(
      `INSERT INTO stops (
        journey_id, city, country, latitude, longitude,
        arrival_date, departure_date, accommodation_name,
        accommodation_url, accommodation_price, accommodation_currency, notes,
        check_in_time, check_out_time
        , address_street, address_house_number, address_postal_code, is_paid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [
        journeyId, city, country, latitude, longitude,
        arrivalDate, departureDate, accommodationName,
        accommodationUrl, accommodationPrice, accommodationCurrency, notes,
        checkInTime || null, checkOutTime || null,
          addressStreet || null, addressHouseNumber || null, postalCode || null, isPaid
      ]
    );

    
    const stop = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('stop:created', stop);
    try {
      await computeAndPersistTotal(journeyId);
      const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
      io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
    } catch (e) {
      console.warn('Failed to recompute total after stop create (DB):', e);
    }

    res.status(201).json(stop);
  } catch (error) {
    console.error('Error creating stop:', error);
    res.status(500).json({ message: 'Failed to create stop' });
  }
};

// Update stop
export const updateStop = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.id);
    // Support partial update for payment status toggle
    if (req.body.isPaid !== undefined && Object.keys(req.body).length === 1) {
      console.log(`✅ Updating stop ${stopId} payment status to:`, req.body.isPaid);
      const { isPaid } = req.body;
      if (!DB_AVAILABLE) {
        const updated = await jsonStore.updateById('stops', stopId, { is_paid: isPaid });
        if (!updated) return res.status(404).json({ message: 'Stop not found' });
        const updatedCamel = toCamelCase(updated);
        const io = req.app.get('io');
        io.emit('stop:updated', updatedCamel);
        try {
          await computeAndPersistTotal(updated.journey_id);
          const journey = toCamelCase(await jsonStore.getById('journeys', updated.journey_id));
          io.emit('journey:updated', journey);
        } catch (e) {
          console.warn('Failed to recompute total after stop update (JSON, partial):', e);
        }
        return res.json(updatedCamel);
      }
      const paidResult = await query(
        `UPDATE stops SET is_paid=$1 WHERE id=$2 RETURNING *`,
        [isPaid, stopId]
      );
      if (!paidResult.rows[0]) {
        console.error(`❌ Stop ${stopId} not found`);
        return res.status(404).json({ message: 'Stop not found' });
      }
      const updated = toCamelCase(paidResult.rows[0]);
      console.log(`✅ Stop ${stopId} updated successfully, is_paid=${updated.isPaid}`);
      const io = req.app.get('io');
      io.emit('stop:updated', updated);
      try {
        await computeAndPersistTotal(updated.journeyId);
        const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [updated.journeyId]);
        io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
      } catch (e) {
        console.warn('Failed to recompute total after stop update (DB, partial):', e);
      }
      return res.json(updated);
    }

    const {
      city,
      country,
      latitude,
      longitude,
      arrivalDate,
      departureDate,
      accommodationName,
      accommodationUrl,
      accommodationPrice,
      accommodationCurrency,
      notes,
      checkInTime,
      checkOutTime
    } = req.body;
    let { addressStreet, addressHouseNumber, postalCode } = req.body;
    
    if (!DB_AVAILABLE) {
      if (addressStreet === '' || addressStreet === undefined) addressStreet = null;
      if (addressHouseNumber === '' || addressHouseNumber === undefined) addressHouseNumber = null;
      if (postalCode === '' || postalCode === undefined) postalCode = null;
      // Auto-mark as paid if accommodation price is 0 or null
      const isPaid = !accommodationPrice || accommodationPrice === 0;
      const updated = await jsonStore.updateById('stops', stopId, {
        city, country, latitude, longitude,
        arrival_date: arrivalDate, departure_date: departureDate,
        address_street: addressStreet, address_house_number: addressHouseNumber, address_postal_code: postalCode,
        accommodation_name: accommodationName, accommodation_url: accommodationUrl,
        accommodation_price: accommodationPrice, accommodation_currency: accommodationCurrency,
        notes, check_in_time: checkInTime || null, check_out_time: checkOutTime || null,
        is_paid: isPaid
      });
      if (!updated) return res.status(404).json({ message: 'Stop not found' });
      const stop = toCamelCase(updated);
      const io = req.app.get('io');
      io.emit('stop:updated', stop);
      try {
        await computeAndPersistTotal(updated.journey_id);
        const journey = toCamelCase(await jsonStore.getById('journeys', updated.journey_id));
        io.emit('journey:updated', journey);
      } catch (e) {
        console.warn('Failed to recompute total after stop update (JSON):', e);
      }
      return res.json(stop);
    }
    // Auto-mark as paid if accommodation price is 0 or null
    const isPaid = !accommodationPrice || accommodationPrice === 0;
    const result = await query(
      `UPDATE stops SET
        city=$1, country=$2, latitude=$3, longitude=$4,
        arrival_date=$5, departure_date=$6, accommodation_name=$7,
        accommodation_url=$8, accommodation_price=$9, accommodation_currency=$10, notes=$11,
        check_in_time=$12, check_out_time=$13
        , address_street=$14, address_house_number=$15, address_postal_code=$16, is_paid=$17
      WHERE id=$18 RETURNING *`,
      [
        city, country, latitude, longitude,
        arrivalDate, departureDate, accommodationName,
        accommodationUrl, accommodationPrice, accommodationCurrency, notes,
        checkInTime || null, checkOutTime || null, addressStreet || null, addressHouseNumber || null, postalCode || null, isPaid, stopId
      ]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Stop not found' });
    }
    
    const stop = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('stop:updated', stop);
    try {
      await computeAndPersistTotal(stop.journeyId);
      const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [stop.journeyId]);
      io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
    } catch (e) {
      console.warn('Failed to recompute total after stop update (DB):', e);
    }

    res.json(stop);
  } catch (error) {
    console.error('Error updating stop:', error);
    res.status(500).json({ message: 'Failed to update stop' });
  }
};

// Delete stop
export const deleteStop = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.id);
    if (!DB_AVAILABLE) {
      // read stop to get journey_id
      const existing = await jsonStore.getById('stops', stopId);
      if (!existing) return res.status(404).json({ message: 'Stop not found' });
      const ok = await jsonStore.deleteById('stops', stopId);
      if (!ok) return res.status(404).json({ message: 'Stop not found' });
      const io = req.app.get('io');
      io.emit('stop:deleted', { id: stopId });
      try {
        await computeAndPersistTotal(existing.journey_id);
        const journey = toCamelCase(await jsonStore.getById('journeys', existing.journey_id));
        io.emit('journey:updated', journey);
      } catch (e) {
        console.warn('Failed to recompute total after stop delete (JSON):', e);
      }
      return res.json({ message: 'Stop deleted successfully' });
    }
    // Read stop record to get journey id
    const sRes = await query('SELECT * FROM stops WHERE id = $1', [stopId]);
    if (!sRes.rows[0]) return res.status(404).json({ message: 'Stop not found' });
    const journeyId = sRes.rows[0].journey_id;
    await query('DELETE FROM stops WHERE id = $1', [stopId]);

    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('stop:deleted', { id: stopId });
    try {
      await computeAndPersistTotal(journeyId);
      const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
      io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
    } catch (e) {
      console.warn('Failed to recompute total after stop delete (DB):', e);
    }

    res.json({ message: 'Stop deleted successfully' });
  } catch (error) {
    console.error('Error deleting stop:', error);
    res.status(500).json({ message: 'Failed to delete stop' });
  }
};

// Reverse Geocoding - coordinates to address
export const reverseGeocode = async (req: Request, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false,
        message: 'Latitude and longitude are required' 
      });
    }
    
    // Use Nominatim OpenStreetMap API (free, no API key needed)
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        lat: latitude,
        lon: longitude,
        format: 'json',
        addressdetails: 1,
      },
      headers: {
        'User-Agent': 'JourneyPlannerApp/1.0',
      },
      timeout: 5000,
    });

    const data = response.data;
    const address = data.address || {};

    res.json({
      success: true,
      data: toCamelCase({
        address: data.display_name || '',
        street: address.road || address.street || '',
        city: address.city || address.town || address.village || address.municipality || '',
        country: address.country || '',
        countryCode: address.country_code?.toUpperCase() || '',
        postcode: address.postcode || '',
      }),
      message: 'Address found successfully'
    });
    
  } catch (error: any) {
    console.error('Error reverse geocoding:', error.message);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get address from coordinates. Please enter manually.' 
    });
  }
};

// Scrape Booking.com URL - Real HTML scraping
export const scrapeBookingUrl = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    if (!url || !url.includes('booking.com')) return res.status(400).json({ success: false, message: 'Invalid Booking.com URL' });

    // Static fetch
    let html = '';
    try {
      const r = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Language': 'en-US' }, timeout: 10000 });
      html = r.data || '';
    } catch (e) { html = ''; }

    const $ = cheerio.load(html || '');
    let hotelName = '';
    let city = '';
    let country = '';
    let address = '';
    let price: number | null = null;
    let currency = 'PLN';

    // JSON-LD
    try {
      $('script[type="application/ld+json"]').each((i, el) => {
        try {
          const txt = $(el).contents().text();
          if (!txt) return;
          const parsed = JSON.parse(txt);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            const types = (item['@type'] && (Array.isArray(item['@type']) ? item['@type'] : [item['@type']])) || [];
            if (types.includes('Hotel') || types.includes('LodgingBusiness') || types.includes('Apartment') || types.includes('Place')) {
              if (item.name) hotelName = String(item.name).trim();
              if (item.address) {
                const adr = item.address;
                if (typeof adr === 'string') address = adr;
                else if (typeof adr === 'object') {
                  const streetAddr = adr.streetAddress || '';
                  const locality = adr.addressLocality || adr.city || '';
                  const countryName = adr.addressCountry || adr.country || '';
                  const postal = adr.postalCode || adr.postcode || '';
                  address = [streetAddr, locality, postal, countryName].filter(Boolean).join(', ');
                  if (!city && locality) city = locality;
                  if (!country && countryName) country = countryName;
                }
              }
              if (item.offers) {
                const offers: any = item.offers;
                const p = offers.price || (offers.priceSpecification && offers.priceSpecification.price) || null;
                const c = offers.priceCurrency || offers.currency || '';
                if (p) { const pn = Number(p); if (!Number.isNaN(pn)) price = pn; if (c) currency = c; }
              }
            }
          }
        } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }

    // script blob scan
    try {
      $('script').each((i, el) => {
        try {
          const txt = $(el).html() || '';
          if (!txt || txt.length < 40) return;
          if (txt.includes('{') && txt.includes('}')) {
            const m = txt.match(/\{[\s\S]*\}/);
            if (!m) return;
            let parsed: any = null;
            try { parsed = JSON.parse(m[0]); } catch (e) {
              try { parsed = JSON.parse(m[0].replace(/(['"])??([a-zA-Z0-9_]+)\1?:/g, '"$2":')); } catch (ee) { return; }
            }
            const walk = (obj: any) => {
              if (!obj || typeof obj !== 'object') return;
              if (!address && (obj.streetAddress || obj.address || obj.address_street || obj.location)) {
                if (obj.streetAddress) address = obj.streetAddress; else if (typeof obj.address === 'string') address = obj.address;
              }
              if (!city && (obj.addressLocality || obj.city || (obj.address && obj.address.city))) city = obj.addressLocality || obj.city || (obj.address && obj.address.city) || city;
              if (!country && (obj.addressCountry || (obj.address && obj.address.country))) country = obj.addressCountry || (obj.address && obj.address.country) || country;
              if ((price == null) && (obj.price || obj.priceValue || (obj.offers && obj.offers.price))) { const p = obj.price || obj.priceValue || (obj.offers && obj.offers.price); const pn = Number(p); if (!Number.isNaN(pn)) price = pn; }
              if (!hotelName && (obj.name || obj.hotelName || obj.title)) hotelName = obj.name || obj.hotelName || obj.title;
              for (const k of Object.keys(obj)) { try { walk(obj[k]); } catch (e) { /* ignore */ } }
            };
            walk(parsed);
          }
        } catch (e) { /* ignore */ }
      });
    } catch (e) { /* ignore */ }

    // cheerio fallbacks
    try {
      if (!hotelName) {
        const og = $('meta[property="og:title"]').attr('content') || $('meta[name="title"]').attr('content');
        if (og) hotelName = String(og).split('|')[0].split('-')[0].trim();
      }
      if (!address) {
        const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
        if (metaDesc && metaDesc.length > 20) {
          const addrMatch = metaDesc.match(/\d{2}-\d{3}[^,\n]*[,\s]*[^,\n]*/);
          if (addrMatch) address = addrMatch[0];
        }
      }
    } catch (e) { /* ignore */ }

    if (!hotelName) hotelName = $('h2[data-testid="title"]').text().trim() || $('h2.pp-header__title').text().trim() || $('h1').first().text().trim() || '';
    if (!hotelName) { const ttl = $('title').text().trim(); if (ttl) hotelName = ttl.split(',')[0].trim(); }

    const ptitle = $('title').text().trim(); if (ptitle) { const parts = ptitle.split(',').map(p => p.trim()); if (parts.length >= 2) city = city || parts[1].replace(/\([^)]*\)/g, '').trim(); }
    const keywords = $('meta[name="keywords"]').attr('content'); if (keywords) { const parts = keywords.split(',').map(p => p.trim()); if (parts.length >= 3) { city = city || parts[1]; country = country || parts[2]; } }
    if (!city) { const loc = $('span[data-node_tt_id="location_score_tooltip"]').text().trim(); if (loc) { const ps = loc.split(',').map(p => p.trim()); if (ps.length >= 2) { city = ps[0]; country = country || ps[ps.length - 1]; } } }
    if (!city) { const bc = $('.bui-breadcrumb__text').last().text().trim(); if (bc) city = bc; }

    address = address || $('span[data-node_tt_id="location_address"]').text().trim() || $('.hp_address_subtitle').text().trim() || '';

    const ptext = $('span[data-testid="price-and-discounted-price"]').text().trim();
    if ((price == null) && ptext) { const m = ptext.match(/[\d\s,]+/); if (m) price = parseFloat(m[0].replace(/\s/g, '').replace(',', '.')); if (ptext.includes('zł')) currency = 'PLN'; else if (ptext.includes('€')) currency = 'EUR'; else if (ptext.includes('$')) currency = 'USD'; }

    // parse dates
    let checkin = ''; let checkout = '';
    try { const urlObj = new URL(url); checkin = urlObj.searchParams.get('checkin') || ''; checkout = urlObj.searchParams.get('checkout') || ''; } catch (e) { }

    // Puppeteer fallback if needed
    if ((!hotelName || !address || price == null)) {
      try {
        // @ts-ignore
        const puppeteerModule: any = require('puppeteer');
        const puppeteer = puppeteerModule && (puppeteerModule.default || puppeteerModule);
        if (puppeteer) {
          const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'], headless: true });
          const page = await browser.newPage();
          await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
          try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            // Retry evaluate a few times in case the page navigates/reloads and invalidates the execution context
            let rendered: any = null;
            const waitSelectors = ['script[type="application/ld+json"]', 'h2[data-testid="title"]', '.hp_address_subtitle', 'span[data-node_tt_id="location_address"]'];
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                // Wait for at least one useful selector or JSON-LD script to appear
                await Promise.race(waitSelectors.map(s => page.waitForSelector(s, { timeout: 6000 }).catch(() => null)));

                rendered = await page.evaluate(() => {
                  const doc: any = (globalThis as any).document;
                  const getText = (sel: string) => { const el = doc.querySelector(sel); return el ? (el.textContent || '').trim() : ''; };
                  let hotelName = getText('h2[data-testid="title"]') || getText('h2.pp-header__title') || getText('h1') || '';
                  let address = getText('span[data-node_tt_id="location_address"]') || getText('.hp_address_subtitle') || '';
                  let price: any = null; let currency = '';
                  try {
                    const scripts: any[] = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
                    for (const s of scripts) {
                      try {
                        const txt = (s as any).textContent || '';
                        if (!txt) continue;
                        const parsed = JSON.parse(txt);
                        const items = Array.isArray(parsed) ? parsed : [parsed];
                        for (const item of items) {
                          if (!item || typeof item !== 'object') continue;
                          if (!hotelName && item.name) hotelName = String(item.name).trim();
                          if (!address && item.address) {
                            const adr = item.address;
                            if (typeof adr === 'string') address = adr; else if (typeof adr === 'object') address = (adr.streetAddress || '') + (adr.addressLocality ? ', ' + adr.addressLocality : '') + (adr.postalCode ? ', ' + adr.postalCode : '') + (adr.addressCountry ? ', ' + (adr.addressCountry.name || adr.addressCountry) : '');
                          }
                          if (item.offers) { const offers: any = item.offers; const p = offers.price || (offers.priceSpecification && offers.priceSpecification.price) || null; const c = offers.priceCurrency || offers.currency || ''; if (p) price = Number(p); if (c) currency = c; }
                        }
                      } catch (e) { }
                    }
                  } catch (e) { }
                  if (price == null) {
                    const pt = getText('span[data-testid="price-and-discounted-price"]') || getText('.bui-price-display__value') || getText('.prco-valign-middle-helper');
                    if (pt) { const m = pt.match(/[\d\s,]+/); if (m) price = Number(m[0].replace(/\s/g, '').replace(',', '.')); if (pt.includes('zł')) currency = 'PLN'; else if (pt.includes('€')) currency = 'EUR'; else if (pt.includes('$')) currency = 'USD'; }
                  }
                  if (!hotelName) { const mt = doc.querySelector('meta[property="og:title"]'); if (mt && (mt as any).content) hotelName = ((mt as any).content as string).split('|')[0].split('-')[0].trim(); if (!hotelName) hotelName = ((doc.title || '') as string).split(',')[0].trim(); }
                  return { hotelName, address, price, currency };
                });

                // If evaluate succeeded, break retry loop
                if (rendered) break;
              } catch (e: any) {
                // If execution context was destroyed, try again after a short wait
                const msg = String(e && e.message ? e.message : e);
                if (msg.includes('Execution context was destroyed') || msg.includes('Cannot find context') || msg.includes('Target closed')) {
                  if (attempt < 2) { await page.waitForTimeout(1000); continue; }
                }
                // Other errors: rethrow
                throw e;
              }
            }

            if (rendered) {
              if (!hotelName && rendered.hotelName) hotelName = rendered.hotelName;
              if ((!address || address.length === 0) && rendered.address) address = rendered.address;
              if ((price == null) && rendered.price != null) price = rendered.price;
              if ((!currency || currency === '') && rendered.currency) currency = rendered.currency || currency;
            }
          } finally {
            try { await browser.close(); } catch (e) { /* ignore close errors */ }
          }
        }
      } catch (e) { console.warn('puppeteer fallback failed or not available:', String(e)); }
    }

    const parseAddress = (addr: string) => {
      if (!addr || !addr.trim()) return {} as any;
      // Normalize whitespace and split into comma-separated parts, preserving order
      const normalized = addr.replace(/\s+/g, ' ').trim();
      const rawParts = normalized.split(',').map(p => p.trim()).filter(Boolean);
      const parts: string[] = [];
      const seen = new Set<string>();
      for (const p of rawParts) {
        if (!seen.has(p)) { seen.add(p); parts.push(p); }
      }

      let street = '';
      let house = '';
      let postcode = '';
      let city = '';
      let country = '';

      const postcodeRe = /\b\d{2}-\d{3}\b|\b\d{5}\b/;
      const streetHouseRe = /^(.*?)(?:\s+)?(\d+[A-Za-z0-9\-\/]*)$/; // street name + number at end

      for (const p of parts) {
        // 1) postcode + city like "00-855 Warszawa"
        const pcMatch = p.match(new RegExp(`(${postcodeRe.source})\\s*(.+)`));
        if (pcMatch) {
          postcode = postcode || pcMatch[1];
          if (!city) city = pcMatch[2].trim();
          continue;
        }

        // 2) standalone postcode
        const pc2 = p.match(postcodeRe);
        if (pc2) {
          postcode = postcode || pc2[0];
          const remainder = p.replace(pc2[0], '').trim();
          if (remainder && !city) city = remainder;
          continue;
        }

        // 3) street + house number
        const sh = p.match(streetHouseRe);
        if (sh) {
          const possibleStreet = sh[1].replace(/^ul\.?\s*/i, '').replace(/^ulica\s*/i, '').trim();
          const possibleHouse = sh[2];
          if (!street) street = possibleStreet;
          if (!house && /\d/.test(possibleHouse)) house = possibleHouse.replace(/\s+/g, '/');
          continue;
        }

        // 4) country detection (simple check)
        const lower = p.toLowerCase();
        if (!country && (lower.includes('polska') || lower.includes('poland') || lower.includes('republika'))) {
          country = p;
          continue;
        }

        // 5) otherwise treat as city if it doesn't contain digits and looks like a place name
        if (!city && !/\d/.test(p) && p.length < 60) {
          city = p;
          continue;
        }
      }

      // Fallbacks: try to extract from first part if nothing found
      if (!street && parts.length) {
        const m = parts[0].match(streetHouseRe);
        if (m) { street = m[1].replace(/^ul\.?\s*/i, '').trim(); house = house || m[2]; }
      }

      if (!city) {
        // pick last non-country, non-postcode, non-street part
        for (let i = parts.length - 1; i >= 0; i--) {
          const p = parts[i];
          if (postcodeRe.test(p)) continue;
          if (/\d/.test(p) && streetHouseRe.test(p)) continue;
          const low = p.toLowerCase();
          if (low.includes('polska') || low.includes('poland') || low.includes('republika')) continue;
          city = p; break;
        }
      }

      // If country still missing, try last part
      if (!country && parts.length) {
        const last = parts[parts.length - 1];
        const low = last.toLowerCase();
        if (low.includes('polska') || low.includes('poland')) country = last;
      }

      return {
        address_street: street || null,
        address_house_number: house || null,
        address_postcode: postcode || null,
        address_city: city || null,
        address_country: country || null
      } as any;
    };

    const parsed = parseAddress(address || '');
    console.log('scrapeBookingUrl: extracted', { hotelName, city, country, address, arrivalDate: checkin, departureDate: checkout, price, currency });

    return res.json({ success: true, data: toCamelCase({ accommodationName: hotelName || '', accommodationUrl: url, city: city || '', country: country || '', address: address || '', ...parsed, arrivalDate: checkin, departureDate: checkout, accommodationPrice: price, accommodationCurrency: currency }), message: hotelName ? `Hotel details extracted: ${hotelName}${city ? ' in ' + city : ''}${price ? `, ${price} ${currency}` : ''}` : 'Could not extract all details. Please verify and fill manually.' });
  } catch (error: any) {
    console.error('Error scraping Booking URL:', error && error.message ? error.message : String(error));
    return res.status(500).json({ success: false, message: `Failed to scrape Booking.com page: ${error && error.message ? error.message : String(error)}. Please enter details manually.` });
  }
};
