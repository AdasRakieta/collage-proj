import { Request, Response } from 'express';
import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';
import { computeAndPersistTotal } from '../services/journeyService';

// Helper: Convert snake_case to camelCase recursively
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  // Keep Date objects as ISO strings
  if (obj instanceof Date) {
    // Default top-level Date -> ISO (keeps time info where necessary)
    return obj.toISOString();
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      const value = obj[key];
      
      // Convert Date objects: date-only fields (snake key ending with _date) -> YYYY-MM-DD
      if (value instanceof Date) {
        if (/(_date)$/.test(key)) {
          acc[camelKey] = value.toISOString().slice(0, 10); // YYYY-MM-DD
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

// Get all attractions for a stop
export const getAttractionsByStopId = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.stopId);
    if (!DB_AVAILABLE) {
      const attractions = (await jsonStore.findByField('attractions', 'stop_id', stopId))
        .sort((a: any, b: any) => (a.id || 0) - (b.id || 0));
      return res.json(toCamelCase(attractions));
    }
    const result = await query(
      'SELECT * FROM attractions WHERE stop_id = $1 ORDER BY id ASC',
      [stopId]
    );
    res.json(toCamelCase(result.rows));
  } catch (error) {
    console.error('Error fetching attractions:', error);
    res.status(500).json({ message: 'Failed to fetch attractions' });
  }
};

// Create attraction
export const createAttraction = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.stopId);
    let { 
      name, description, estimatedCost, duration, currency,
      address, addressStreet, addressCity, addressPostalCode, addressCountry,
      latitude, longitude, visitTime, openingTime, closingTime, tag 
    } = req.body;
    
    // Fix: convert empty string to null for numeric/optional fields
    if (estimatedCost === '' || estimatedCost === undefined || estimatedCost === 0) estimatedCost = null;
    if (duration === '' || duration === undefined) duration = null;
    if (address === '' || address === undefined) address = null;
    if (addressStreet === '' || addressStreet === undefined) addressStreet = null;
    if (addressCity === '' || addressCity === undefined) addressCity = null;
    if (addressPostalCode === '' || addressPostalCode === undefined) addressPostalCode = null;
    if (addressCountry === '' || addressCountry === undefined) addressCountry = null;
    if (latitude === '' || latitude === undefined) latitude = null;
    if (longitude === '' || longitude === undefined) longitude = null;
    if (visitTime === '' || visitTime === undefined) visitTime = null;
    if (openingTime === '' || openingTime === undefined) openingTime = null;
    if (closingTime === '' || closingTime === undefined) closingTime = null;
    if (tag === '' || tag === undefined) tag = null;
    
    if (!DB_AVAILABLE) {
      // Auto-mark as paid if estimated cost is 0 or null
      const isPaid = !estimatedCost || estimatedCost === 0;
      const newAttraction = await jsonStore.insert('attractions', {
        stop_id: stopId,
        name, description, estimated_cost: estimatedCost, duration, currency: currency || 'PLN',
        address, address_street: addressStreet, address_city: addressCity, address_postal_code: addressPostalCode, address_country: addressCountry,
        latitude, longitude, visit_time: visitTime, opening_time: openingTime, closing_time: closingTime, tag,
        is_paid: isPaid,
        created_at: new Date().toISOString()
      });
      const attraction = toCamelCase(newAttraction);
      const io = req.app.get('io');
      io.emit('attraction:created', attraction);
      try {
        const stop = await jsonStore.getById('stops', stopId);
        if (stop) {
          await computeAndPersistTotal(stop.journey_id);
          const journey = toCamelCase(await jsonStore.getById('journeys', stop.journey_id));
          io.emit('journey:updated', journey);
        }
      } catch (e) {
        console.warn('Failed to recompute total after attraction create (JSON):', e);
      }
      return res.status(201).json(attraction);
    }
    // Auto-mark as paid if estimated cost is 0 or null
    const isPaid = !estimatedCost || estimatedCost === 0;
    const result = await query(
      `INSERT INTO attractions (
        stop_id, name, description, estimated_cost, duration, currency,
        address, address_street, address_city, address_postal_code, address_country,
        latitude, longitude, visit_time, opening_time, closing_time, is_paid, tag
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) RETURNING *`,
      [stopId, name, description, estimatedCost, duration, currency || 'PLN',
       address, addressStreet, addressCity, addressPostalCode, addressCountry,
       latitude, longitude, visitTime, openingTime, closingTime, isPaid, tag]
    );
    const attraction = toCamelCase(result.rows[0]);
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('attraction:created', attraction);
    try {
      const stopRes = await query('SELECT journey_id FROM stops WHERE id = $1', [stopId]);
      const journeyId = stopRes.rows[0]?.journey_id;
      if (journeyId) {
        await computeAndPersistTotal(journeyId);
        const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
        io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
      }
    } catch (e) {
      console.warn('Failed to recompute total after attraction create (DB):', e);
    }
    res.status(201).json(attraction);
  } catch (error) {
    console.error('Error creating attraction:', error);
    res.status(500).json({ message: 'Failed to create attraction' });
  }
};

// Update attraction
export const updateAttraction = async (req: Request, res: Response) => {
  try {
    const attractionId = parseInt(req.params.id);
    // Allow lightweight payment status toggle
    if (req.body.isPaid !== undefined && Object.keys(req.body).length === 1) {
      console.log(`✅ Updating attraction ${attractionId} payment status to:`, req.body.isPaid);
      const { isPaid } = req.body;
      if (!DB_AVAILABLE) {
        const updated = await jsonStore.updateById('attractions', attractionId, { is_paid: isPaid });
        if (!updated) return res.status(404).json({ message: 'Attraction not found' });
        const updatedCamel = toCamelCase(updated);
        const io = req.app.get('io');
        io.emit('attraction:updated', updatedCamel);
        try {
          const stop = await jsonStore.getById('stops', updated.stop_id);
          if (stop) {
            await computeAndPersistTotal(stop.journey_id);
            const journey = toCamelCase(await jsonStore.getById('journeys', stop.journey_id));
            io.emit('journey:updated', journey);
          }
        } catch (e) {
          console.warn('Failed to recompute total after attraction update (JSON, partial):', e);
        }
        return res.json(updatedCamel);
      }
      const paidResult = await query(
        'UPDATE attractions SET is_paid=$1 WHERE id=$2 RETURNING *',
        [isPaid, attractionId]
      );
      if (!paidResult.rows[0]) {
        console.error(`❌ Attraction ${attractionId} not found`);
        return res.status(404).json({ message: 'Attraction not found' });
      }
      const updated = toCamelCase(paidResult.rows[0]);
      console.log(`✅ Attraction ${attractionId} updated successfully, is_paid=${updated.isPaid}`);
      const io = req.app.get('io');
      io.emit('attraction:updated', updated);
      try {
        const stopRes = await query('SELECT journey_id FROM stops WHERE id = $1', [updated.stopId]);
        const journeyId = stopRes.rows[0]?.journey_id;
        if (journeyId) {
          await computeAndPersistTotal(journeyId);
          const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
          io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
        }
      } catch (e) {
        console.warn('Failed to recompute total after attraction update (DB, partial):', e);
      }
      return res.json(updated);
    }

    let { 
      name, description, estimatedCost, duration, currency,
      address, addressStreet, addressCity, addressPostalCode, addressCountry,
      latitude, longitude, visitTime, openingTime, closingTime, tag, planned_date, planned_time 
    } = req.body;
    
    // Fix: convert empty string or undefined for optional fields to null
    if (estimatedCost === '' || estimatedCost === undefined || estimatedCost === 0) estimatedCost = null;
    if (duration === '' || duration === undefined) duration = null;
    if (address === '' || address === undefined) address = null;
    if (addressStreet === '' || addressStreet === undefined) addressStreet = null;
    if (addressCity === '' || addressCity === undefined) addressCity = null;
    if (addressPostalCode === '' || addressPostalCode === undefined) addressPostalCode = null;
    if (addressCountry === '' || addressCountry === undefined) addressCountry = null;
    if (latitude === '' || latitude === undefined) latitude = null;
    if (longitude === '' || longitude === undefined) longitude = null;
    if (visitTime === '' || visitTime === undefined) visitTime = null;
    if (openingTime === '' || openingTime === undefined) openingTime = null;
    if (closingTime === '' || closingTime === undefined) closingTime = null;
    if (tag === '' || tag === undefined) tag = null;
    if (planned_date === '' || planned_date === undefined) planned_date = null;
    if (planned_time === '' || planned_time === undefined) planned_time = null;
    
    if (!DB_AVAILABLE) {
      // Auto-mark as paid if estimated cost is 0 or null
      const isPaid = !estimatedCost || estimatedCost === 0;
      const updated = await jsonStore.updateById('attractions', attractionId, {
        name, description, estimated_cost: estimatedCost, duration, currency: currency || 'USD',
        address, address_street: addressStreet, address_city: addressCity, address_postal_code: addressPostalCode, address_country: addressCountry,
        latitude, longitude, visit_time: visitTime, opening_time: openingTime, closing_time: closingTime, tag,
        planned_date, planned_time,
        is_paid: isPaid
      });
      if (!updated) return res.status(404).json({ message: 'Attraction not found' });
      const attraction = toCamelCase(updated);
      const io = req.app.get('io');
      io.emit('attraction:updated', attraction);
      return res.json(attraction);
    }
    // Auto-mark as paid if estimated cost is 0 or null
    const isPaid = !estimatedCost || estimatedCost === 0;
    const result = await query(
      `UPDATE attractions SET 
        name=$1, description=$2, estimated_cost=$3, duration=$4, currency=$5,
        address=$6, address_street=$7, address_city=$8, address_postal_code=$9, address_country=$10,
        latitude=$11, longitude=$12, visit_time=$13, opening_time=$14, closing_time=$15, is_paid=$16, tag=$17,
        planned_date=$18, planned_time=$19
      WHERE id=$20 RETURNING *`,
      [name, description, estimatedCost, duration, currency || 'USD',
       address, addressStreet, addressCity, addressPostalCode, addressCountry,
       latitude, longitude, visitTime, openingTime, closingTime, isPaid, tag,
       planned_date, planned_time, attractionId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    const attraction = toCamelCase(result.rows[0]);
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('attraction:updated', attraction);
    try {
      const stop = await jsonStore.getById('stops', attraction.stop_id);
      if (stop) {
        await computeAndPersistTotal(stop.journey_id);
        const journey = toCamelCase(await jsonStore.getById('journeys', stop.journey_id));
        io.emit('journey:updated', journey);
      }
    } catch (e) {
      console.warn('Failed to recompute total after attraction update (JSON):', e);
    }
    res.json(attraction);
  } catch (error) {
    console.error('Error updating attraction:', error);
    res.status(500).json({ message: 'Failed to update attraction' });
  }
};

// Delete attraction
export const deleteAttraction = async (req: Request, res: Response) => {
  try {
    const attractionId = parseInt(req.params.id);
    if (!DB_AVAILABLE) {
      const existing = await jsonStore.getById('attractions', attractionId);
      if (!existing) return res.status(404).json({ message: 'Attraction not found' });
      const ok = await jsonStore.deleteById('attractions', attractionId);
      if (!ok) return res.status(404).json({ message: 'Attraction not found' });
      const io = req.app.get('io');
      io.emit('attraction:deleted', { id: attractionId });
      try {
        const stop = await jsonStore.getById('stops', existing.stop_id);
        if (stop) {
          await computeAndPersistTotal(stop.journey_id);
          const journey = toCamelCase(await jsonStore.getById('journeys', stop.journey_id));
          io.emit('journey:updated', journey);
        }
      } catch (e) {
        console.warn('Failed to recompute total after attraction delete (JSON):', e);
      }
      return res.json({ message: 'Attraction deleted successfully' });
    }
    const aRes = await query('SELECT stop_id FROM attractions WHERE id = $1', [attractionId]);
    const stopId = aRes.rows[0]?.stop_id;
    await query('DELETE FROM attractions WHERE id = $1', [attractionId]);
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('attraction:deleted', { id: attractionId });
    try {
      if (stopId) {
        const stopRes = await query('SELECT journey_id FROM stops WHERE id = $1', [stopId]);
        const journeyId = stopRes.rows[0]?.journey_id;
        if (journeyId) {
          await computeAndPersistTotal(journeyId);
          const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
          io.emit('journey:updated', toCamelCase(journeyRes.rows[0]));
        }
      }
    } catch (e) {
      console.warn('Failed to recompute total after attraction delete (DB):', e);
    }
    
    res.json({ message: 'Attraction deleted successfully' });
  } catch (error) {
    console.error('Error deleting attraction:', error);
    res.status(500).json({ message: 'Failed to delete attraction' });
  }
};

// Reorder attractions within a stop (bulk update order_index)
export const reorderAttractions = async (req: Request, res: Response) => {
  try {
    const stopId = parseInt(req.params.stopId);
    const { orderedIds } = req.body; // Array of attraction IDs in new order
    
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'orderedIds must be an array' });
    }
    
    if (!DB_AVAILABLE) {
      // JSON store implementation
      for (let i = 0; i < orderedIds.length; i++) {
        await jsonStore.updateById('attractions', orderedIds[i], { order_index: i });
      }
      const attractions = (await jsonStore.findByField('attractions', 'stop_id', stopId))
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));
      const io = req.app.get('io');
      io.emit('attractions:reordered', { stopId, attractions: toCamelCase(attractions) });
      return res.json(toCamelCase(attractions));
    }
    
    // PostgreSQL implementation - batch update
    for (let i = 0; i < orderedIds.length; i++) {
      await query(
        'UPDATE attractions SET order_index = $1 WHERE id = $2 AND stop_id = $3',
        [i, orderedIds[i], stopId]
      );
    }
    
    const result = await query(
      'SELECT * FROM attractions WHERE stop_id = $1 ORDER BY order_index ASC',
      [stopId]
    );
    
    const attractions = toCamelCase(result.rows);
    const io = req.app.get('io');
    io.emit('attractions:reordered', { stopId, attractions });
    
    res.json(attractions);
  } catch (error) {
    console.error('Error reordering attractions:', error);
    res.status(500).json({ message: 'Failed to reorder attractions' });
  }
};

// Move attraction to another stop
export const moveAttraction = async (req: Request, res: Response) => {
  try {
    const attractionId = parseInt(req.params.id);
    const { newStopId, orderIndex } = req.body;
    
    if (!newStopId) {
      return res.status(400).json({ message: 'newStopId is required' });
    }
    
    if (!DB_AVAILABLE) {
      const updated = await jsonStore.updateById('attractions', attractionId, {
        stop_id: newStopId,
        order_index: orderIndex ?? 0
      });
      if (!updated) return res.status(404).json({ message: 'Attraction not found' });
      const attraction = toCamelCase(updated);
      const io = req.app.get('io');
      io.emit('attraction:moved', attraction);
      return res.json(attraction);
    }
    
    const result = await query(
      'UPDATE attractions SET stop_id = $1, order_index = $2 WHERE id = $3 RETURNING *',
      [newStopId, orderIndex ?? 0, attractionId]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    const attraction = toCamelCase(result.rows[0]);
    const io = req.app.get('io');
    io.emit('attraction:moved', attraction);
    
    res.json(attraction);
  } catch (error) {
    console.error('Error moving attraction:', error);
    res.status(500).json({ message: 'Failed to move attraction' });
  }
};

// Update attraction priority
export const updateAttractionPriority = async (req: Request, res: Response) => {
  try {
    const attractionId = parseInt(req.params.id);
    const { priority } = req.body;
    
    const validPriorities = ['must', 'should', 'could', 'skip'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ message: 'Invalid priority. Must be one of: must, should, could, skip' });
    }
    
    if (!DB_AVAILABLE) {
      const updated = await jsonStore.updateById('attractions', attractionId, { priority });
      if (!updated) return res.status(404).json({ message: 'Attraction not found' });
      const attraction = toCamelCase(updated);
      const io = req.app.get('io');
      io.emit('attraction:updated', attraction);
      return res.json(attraction);
    }
    
    const result = await query(
      'UPDATE attractions SET priority = $1 WHERE id = $2 RETURNING *',
      [priority, attractionId]
    );
    
    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Attraction not found' });
    }
    
    const attraction = toCamelCase(result.rows[0]);
    const io = req.app.get('io');
    io.emit('attraction:updated', attraction);
    
    res.json(attraction);
  } catch (error) {
    console.error('Error updating attraction priority:', error);
    res.status(500).json({ message: 'Failed to update attraction priority' });
  }
};

// Bulk update attractions (order, priority, planned date/time)
export const bulkUpdateAttractions = async (req: Request, res: Response) => {
  try {
    const { updates } = req.body; // Array of { id, orderIndex?, priority?, plannedDate?, plannedTime?, stopId? }
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ message: 'updates must be an array' });
    }
    
    const results: any[] = [];
    
    for (const update of updates) {
      const { id, orderIndex, priority, planned_date, plannedDate, plannedTime, stopId } = update;
      // Accept both planned_date and plannedDate for compatibility
      let safePlannedDate = planned_date || plannedDate;
      if (typeof safePlannedDate === 'string') {
        // Strip time if present (e.g., '2024-12-22T12:00:00' -> '2024-12-22')
        safePlannedDate = safePlannedDate.split('T')[0];
      }
      if (!DB_AVAILABLE) {
        const fields: any = {};
        if (orderIndex !== undefined) fields.order_index = orderIndex;
        if (priority !== undefined) fields.priority = priority;
        if (safePlannedDate !== undefined) fields.planned_date = safePlannedDate;
        if (plannedTime !== undefined) fields.planned_time = plannedTime;
        if (stopId !== undefined) fields.stop_id = stopId;
        const updated = await jsonStore.updateById('attractions', id, fields);
        if (updated) results.push(toCamelCase(updated));
      } else {
        const setClauses: string[] = [];
        const values: any[] = [];
        let paramIndex = 1;
        if (orderIndex !== undefined) {
          setClauses.push(`order_index = $${paramIndex++}`);
          values.push(orderIndex);
        }
        if (priority !== undefined) {
          setClauses.push(`priority = $${paramIndex++}`);
          values.push(priority);
        }
        if (safePlannedDate !== undefined) {
          setClauses.push(`planned_date = $${paramIndex++}`);
          values.push(safePlannedDate);
        }
        if (plannedTime !== undefined) {
          setClauses.push(`planned_time = $${paramIndex++}`);
          values.push(plannedTime);
        }
        if (stopId !== undefined) {
          setClauses.push(`stop_id = $${paramIndex++}`);
          values.push(stopId);
        }
        if (setClauses.length > 0) {
          values.push(id);
          const result = await query(
            `UPDATE attractions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            values
          );
          if (result.rows[0]) results.push(toCamelCase(result.rows[0]));
        }
      }
    }
    
    const io = req.app.get('io');
    io.emit('attractions:bulkUpdated', results);
    
    res.json(results);
  } catch (error) {
    console.error('Error bulk updating attractions:', error);
    res.status(500).json({ message: 'Failed to bulk update attractions' });
  }
};
