import { Request, Response } from 'express';
import { query } from '../config/db';

// Helper to convert snake_case to camelCase
const toCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

// Get all journeys
export const getAllJourneys = async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT * FROM journeys 
      ORDER BY created_at DESC
    `);
    
    res.json(toCamelCase(result.rows));
  } catch (error: any) {
    console.error('Error fetching journeys:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get journey by ID with all details
export const getJourneyById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get journey
    const journeyResult = await query('SELECT * FROM journeys WHERE id = $1', [id]);
    if (journeyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Get stops
    const stopsResult = await query(
      'SELECT * FROM stops WHERE journey_id = $1 ORDER BY arrival_date',
      [id]
    );

    // Get attractions for each stop
    const stops = await Promise.all(
      stopsResult.rows.map(async (stop) => {
        const attractionsResult = await query(
          'SELECT * FROM attractions WHERE stop_id = $1',
          [stop.id]
        );
        return { ...stop, attractions: attractionsResult.rows };
      })
    );

    // Get transports
    const transportsResult = await query(
      'SELECT * FROM transports WHERE journey_id = $1 ORDER BY departure_date',
      [id]
    );

    const journey = {
      ...journeyResult.rows[0],
      stops,
      transports: transportsResult.rows
    };

    res.json(toCamelCase(journey));
  } catch (error: any) {
    console.error('Error fetching journey:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create new journey
export const createJourney = async (req: Request, res: Response) => {
  try {
    const { title, description, startDate, endDate, currency = 'PLN' } = req.body;

    if (!title || !startDate || !endDate) {
      return res.status(400).json({ error: 'Title, start date, and end date are required' });
    }

    const result = await query(
      `INSERT INTO journeys (title, description, start_date, end_date, currency)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [title, description, startDate, endDate, currency]
    );

    res.status(201).json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    console.error('Error creating journey:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update journey
export const updateJourney = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate, currency } = req.body;

    const result = await query(
      `UPDATE journeys 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           start_date = COALESCE($3, start_date),
           end_date = COALESCE($4, end_date),
           currency = COALESCE($5, currency),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [title, description, startDate, endDate, currency, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    res.json(toCamelCase(result.rows[0]));
  } catch (error: any) {
    console.error('Error updating journey:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete journey
export const deleteJourney = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM journeys WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    res.json({ message: 'Journey deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting journey:', error);
    res.status(500).json({ error: error.message });
  }
};

// Calculate total cost
export const getTotalCost = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get journey currency
    const journeyResult = await query('SELECT currency FROM journeys WHERE id = $1', [id]);
    if (journeyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    // Calculate costs from stops (accommodation)
    const stopsResult = await query(
      'SELECT COALESCE(SUM(accommodation_price), 0) as total FROM stops WHERE journey_id = $1',
      [id]
    );

    // Calculate costs from transports
    const transportsResult = await query(
      'SELECT COALESCE(SUM(price), 0) as total FROM transports WHERE journey_id = $1',
      [id]
    );

    // Calculate costs from attractions
    const attractionsResult = await query(
      `SELECT COALESCE(SUM(a.estimated_cost), 0) as total 
       FROM attractions a 
       JOIN stops s ON a.stop_id = s.id 
       WHERE s.journey_id = $1`,
      [id]
    );

    const totalCost = 
      parseFloat(stopsResult.rows[0].total) +
      parseFloat(transportsResult.rows[0].total) +
      parseFloat(attractionsResult.rows[0].total);

    res.json({
      totalCost,
      currency: journeyResult.rows[0].currency,
      breakdown: {
        accommodations: parseFloat(stopsResult.rows[0].total),
        transports: parseFloat(transportsResult.rows[0].total),
        attractions: parseFloat(attractionsResult.rows[0].total)
      }
    });
  } catch (error: any) {
    console.error('Error calculating total cost:', error);
    res.status(500).json({ error: error.message });
  }
};
