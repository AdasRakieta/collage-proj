import { Request, Response } from 'express';
import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';
import { computeAndPersistTotal } from '../services/journeyService';
import { scrapeTicketData } from '../services/ticketScraper';

// Convert snake_case to camelCase and handle Date objects
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  // Keep Date objects as ISO strings unless a date-only column (ends with _date)
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = obj[key];
      
      // Convert Date objects to ISO strings
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

// Get all transports for a journey
export const getTransportsByJourneyId = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    if (!DB_AVAILABLE) {
      const transports = (await jsonStore.findByField('transports', 'journey_id', journeyId))
        .sort((a: any, b: any) => (new Date(a.departure_date || 0).getTime()) - (new Date(b.departure_date || 0).getTime()));
      return res.json(toCamelCase(transports));
    }
    const result = await query(
      'SELECT * FROM transports WHERE journey_id = $1 ORDER BY departure_date ASC',
      [journeyId]
    );
    res.json(toCamelCase(result.rows));
  } catch (error) {
    console.error('Error fetching transports:', error);
    res.status(500).json({ message: 'Failed to fetch transports' });
  }
};

// Create transport
export const createTransport = async (req: Request, res: Response) => {
  try {
    const journeyId = parseInt(req.params.journeyId);
    const {
      type,
      fromLocation,
      toLocation,
      departureDate,
      arrivalDate,
      price,
      currency,
      bookingUrl,
      notes,
      flightNumber,
      trainNumber
    } = req.body;
    
    // Convert empty strings to null for optional date fields
    const cleanArrivalDate = arrivalDate && arrivalDate.trim() !== '' ? arrivalDate : null;
    const cleanDepartureDate = departureDate && departureDate.trim() !== '' ? departureDate : null;
    const cleanFlightNumber = flightNumber && flightNumber.trim() !== '' ? flightNumber : null;
    const cleanTrainNumber = trainNumber && trainNumber.trim() !== '' ? trainNumber : null;
    
    if (!DB_AVAILABLE) {
      // Auto-mark as paid if price is 0 or null
      const isPaid = !price || price === 0;
      const newTransport = await jsonStore.insert('transports', {
        journey_id: journeyId, type, from_location: fromLocation, to_location: toLocation,
        departure_date: cleanDepartureDate, arrival_date: cleanArrivalDate, price, currency, booking_url: bookingUrl, notes,
        flight_number: cleanFlightNumber, train_number: cleanTrainNumber,
        is_paid: isPaid,
        created_at: new Date().toISOString()
      });
      const transport = toCamelCase(newTransport);
      const io = req.app.get('io');
      io.emit('transport:created', transport);
      try {
        await computeAndPersistTotal(journeyId);
        const journey = toCamelCase(await jsonStore.getById('journeys', journeyId));
        io.emit('journey:updated', journey);
      } catch (e) {
        console.warn('Failed to recompute total after transport create (JSON):', e);
      }
      return res.status(201).json(transport);
    }
    // Auto-mark as paid if price is 0 or null
    const isPaid = !price || price === 0;
    const result = await query(
      `INSERT INTO transports (
        journey_id, type, from_location, to_location,
        departure_date, arrival_date, price, currency, booking_url, notes,
        flight_number, train_number, is_paid
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [
        journeyId, type, fromLocation, toLocation,
        cleanDepartureDate, cleanArrivalDate, price, currency, bookingUrl, notes,
        cleanFlightNumber, cleanTrainNumber, isPaid
      ]
    );
    
    const transport = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('transport:created', transport);
    try {
      await computeAndPersistTotal(journeyId);
      const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
      io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
    } catch (e) {
      console.warn('Failed to recompute total after transport create (DB):', e);
    }
    
    res.status(201).json(transport);
  } catch (error) {
    console.error('Error creating transport:', error);
    res.status(500).json({ message: 'Failed to create transport' });
  }
};

// Update transport
export const updateTransport = async (req: Request, res: Response) => {
  try {
    const transportId = parseInt(req.params.id);
    // Handle payment status toggle as a lightweight partial update
    if (req.body.isPaid !== undefined && Object.keys(req.body).length === 1) {
      console.log(`✅ Updating transport ${transportId} payment status to:`, req.body.isPaid);
      const { isPaid } = req.body;
      if (!DB_AVAILABLE) {
        const updated = await jsonStore.updateById('transports', transportId, { is_paid: isPaid });
        if (!updated) return res.status(404).json({ message: 'Transport not found' });
        const updatedCamel = toCamelCase(updated);
        const io = req.app.get('io');
        io.emit('transport:updated', updatedCamel);
        try {
          await computeAndPersistTotal(updated.journey_id);
          const journey = toCamelCase(await jsonStore.getById('journeys', updated.journey_id));
          io.emit('journey:updated', journey);
        } catch (e) {
          console.warn('Failed to recompute total after transport update (JSON, partial):', e);
        }
        return res.json(updatedCamel);
      }
      const paidResult = await query(
        `UPDATE transports SET is_paid=$1 WHERE id=$2 RETURNING *`,
        [isPaid, transportId]
      );
      if (!paidResult.rows[0]) {
        console.error(`❌ Transport ${transportId} not found`);
        return res.status(404).json({ message: 'Transport not found' });
      }
      const updated = toCamelCase(paidResult.rows[0]);
      console.log(`✅ Transport ${transportId} updated successfully, is_paid=${updated.isPaid}`);
      const io = req.app.get('io');
      io.emit('transport:updated', updated);
      try {
        await computeAndPersistTotal(updated.journeyId);
        const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [updated.journeyId]);
        io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
      } catch (e) {
        console.warn('Failed to recompute total after transport update (DB, partial):', e);
      }
      return res.json(updated);
    }

    const {
      type,
      fromLocation,
      toLocation,
      departureDate,
      arrivalDate,
      price,
      currency,
      bookingUrl,
      notes,
      flightNumber,
      trainNumber
    } = req.body;
    
    // Convert empty strings to null for optional date fields
    const cleanArrivalDate = arrivalDate && arrivalDate.trim() !== '' ? arrivalDate : null;
    const cleanDepartureDate = departureDate && departureDate.trim() !== '' ? departureDate : null;
    const cleanFlightNumber = flightNumber && flightNumber.trim() !== '' ? flightNumber : null;
    const cleanTrainNumber = trainNumber && trainNumber.trim() !== '' ? trainNumber : null;
    
    if (!DB_AVAILABLE) {
      // Auto-mark as paid if price is 0 or null
      const isPaid = !price || price === 0;
      const updated = await jsonStore.updateById('transports', transportId, {
        type, from_location: fromLocation, to_location: toLocation,
        departure_date: cleanDepartureDate, arrival_date: cleanArrivalDate, price,
        currency, booking_url: bookingUrl, notes, flight_number: cleanFlightNumber, train_number: cleanTrainNumber,
        is_paid: isPaid
      });
      if (!updated) return res.status(404).json({ message: 'Transport not found' });
      const transport = toCamelCase(updated);
      const io = req.app.get('io');
      io.emit('transport:updated', transport);
      try {
        await computeAndPersistTotal(transport.journeyId);
        const journey = toCamelCase(await jsonStore.getById('journeys', transport.journeyId));
        io.emit('journey:updated', journey);
      } catch (e) {
        console.warn('Failed to recompute total after transport update (JSON):', e);
      }
      return res.json(transport);
    }
    // Auto-mark as paid if price is 0 or null
    const isPaid = !price || price === 0;
    const result = await query(
      `UPDATE transports SET
        type=$1, from_location=$2, to_location=$3,
        departure_date=$4, arrival_date=$5, price=$6,
        currency=$7, booking_url=$8, notes=$9,
        flight_number=$10, train_number=$11, is_paid=$12
      WHERE id=$13 RETURNING *`,
      [
        type, fromLocation, toLocation,
        cleanDepartureDate, cleanArrivalDate, price,
        currency, bookingUrl, notes,
        cleanFlightNumber, cleanTrainNumber, isPaid, transportId
      ]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Transport not found' });
    }
    
    const transport = toCamelCase(result.rows[0]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('transport:updated', transport);
    
    res.json(transport);
  } catch (error) {
    console.error('Error updating transport:', error);
    res.status(500).json({ message: 'Failed to update transport' });
  }
};

// Delete transport
export const deleteTransport = async (req: Request, res: Response) => {
  try {
    const transportId = parseInt(req.params.id);
    if (!DB_AVAILABLE) {
      const transport = await jsonStore.getById('transports', transportId);
      if (!transport) return res.status(404).json({ message: 'Transport not found' });
      const journeyId = transport.journey_id;
      const ok = await jsonStore.deleteById('transports', transportId);
      if (!ok) return res.status(404).json({ message: 'Transport not found' });
      const io = req.app.get('io');
      io.emit('transport:deleted', { id: transportId, journeyId });
      return res.json({ message: 'Transport deleted successfully' });
    }
    
    // Get journeyId before deleting
    const transportResult = await query('SELECT journey_id FROM transports WHERE id = $1', [transportId]);
    const journeyId = transportResult.rows[0]?.journey_id;
    
    await query('DELETE FROM transports WHERE id = $1', [transportId]);
    
    // Emit Socket.IO event with journeyId for proper filtering
    const io = req.app.get('io');
    io.emit('transport:deleted', { id: transportId, journeyId });
    try {
      await computeAndPersistTotal(journeyId);
      const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
      io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
    } catch (e) {
      console.warn('Failed to recompute total after transport delete (DB):', e);
    }
    
    res.json({ message: 'Transport deleted successfully' });
  } catch (error) {
    console.error('Error deleting transport:', error);
    res.status(500).json({ message: 'Failed to delete transport' });
  }
};

/**
 * Scrape ticket data from URL (flight, train, etc.)
 */
export const scrapeTicket = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ message: 'URL is required' });
    }
    
    console.log(`🔍 Scraping ticket data from: ${url}`);
    const scrapedData = await scrapeTicketData(url);
    
    if (!scrapedData.success) {
      return res.status(400).json({ 
        message: 'Failed to scrape ticket data',
        error: scrapedData.error 
      });
    }
    
    console.log('✅ Scraped data:', scrapedData);
    res.json(scrapedData);
    
  } catch (error: any) {
    console.error('Error scraping ticket:', error);
    res.status(500).json({ 
      message: 'Failed to scrape ticket data',
      error: error.message 
    });
  }
};
