import { query, DB_AVAILABLE } from '../config/db';
import jsonStore from '../config/jsonStore';
import { convert as convertCurrency } from './currencyService';

export const computeAndPersistTotal = async (journeyId: number): Promise<number> => {
  if (!DB_AVAILABLE) {
    const journey = await jsonStore.getById('journeys', journeyId);
    if (!journey) throw new Error('Journey not found');
    const mainCurrency = journey.currency || 'PLN';

    const stops = await jsonStore.findByField('stops', 'journey_id', journeyId);
    const transports = await jsonStore.findByField('transports', 'journey_id', journeyId);

    let sumStops = 0;
    for (const s of (stops || [])) {
      const price = parseFloat(s.accommodation_price || 0) || 0;
      const curr = s.accommodation_currency || journey.currency || 'PLN';
      let converted = price;
      if (price && curr !== mainCurrency) {
        try {
          converted = await convertCurrency(price, curr, mainCurrency);
        } catch (e) {
          converted = price;
        }
      }
      // persist converted value into JSON store for immediate consistency
      try {
        await jsonStore.updateById('stops', s.id, {
          accommodation_price_converted: Number(converted.toFixed(2)),
          accommodation_price_converted_currency: mainCurrency,
        });
      } catch (_) {}
      sumStops += converted;
    }

    let sumTrans = 0;
    for (const t of (transports || [])) {
      const price = parseFloat(t.price || 0) || 0;
      const curr = t.currency || journey.currency || 'PLN';
      let converted = price;
      if (price && curr !== mainCurrency) {
        try {
          converted = await convertCurrency(price, curr, mainCurrency);
        } catch (e) {
          converted = price;
        }
      }
      try {
        await jsonStore.updateById('transports', t.id, {
          price_converted: Number(converted.toFixed(2)),
          price_converted_currency: mainCurrency,
        });
      } catch (_) {}
      sumTrans += converted;
    }

    const attractions = await jsonStore.getAll('attractions');
    const journeyStopIds = (stops || []).map((s: any) => s.id);
    let sumAttr = 0;
    for (const a of (attractions || [])) {
      if (!journeyStopIds.includes(a.stop_id)) continue;
      const cost = parseFloat(a.estimated_cost || 0) || 0;
      const curr = a.currency || mainCurrency;
      let converted = cost;
      if (cost && curr !== mainCurrency) {
        try {
          converted = await convertCurrency(cost, curr, mainCurrency);
        } catch (e) {
          converted = cost;
        }
      }
      try {
        await jsonStore.updateById('attractions', a.id, {
          estimated_cost_converted: Number(converted.toFixed(2)),
          estimated_cost_converted_currency: mainCurrency,
        });
      } catch (_) {}
      sumAttr += converted;
    }

    const total = sumStops + sumTrans + sumAttr;
    await jsonStore.updateById('journeys', journeyId, { total_estimated_cost: total });
    return total;
  }

  // DB flow
  const journeyRes = await query('SELECT * FROM journeys WHERE id = $1', [journeyId]);
  const journey = journeyRes.rows[0];
  if (!journey) throw new Error('Journey not found');
  const mainCurrency = journey.currency || 'PLN';

  const stopsRes = await query('SELECT * FROM stops WHERE journey_id = $1', [journeyId]);
  const transportsRes = await query('SELECT * FROM transports WHERE journey_id = $1', [journeyId]);

  let sumStops = 0;
  for (const s of stopsRes.rows) {
    const price = parseFloat(s.accommodation_price || 0) || 0;
    const curr = s.accommodation_currency || journey.currency || 'PLN';
    let converted = price;
    if (price && curr !== mainCurrency) {
      try {
        converted = await convertCurrency(price, curr, mainCurrency);
      } catch (e) {
        converted = price;
      }
    }
    // try to persist converted values to DB if possible
    try {
      await query(
        'UPDATE stops SET accommodation_price_converted = $1, accommodation_price_converted_currency = $2 WHERE id = $3',
        [Number(converted.toFixed(2)), mainCurrency, s.id]
      );
    } catch (_) {}
    sumStops += converted;
  }

  let sumTrans = 0;
  for (const t of transportsRes.rows) {
    const price = parseFloat(t.price || 0) || 0;
    const curr = t.currency || journey.currency || 'PLN';
    let converted = price;
    if (price && curr !== mainCurrency) {
      try {
        converted = await convertCurrency(price, curr, mainCurrency);
      } catch (e) {
        converted = price;
      }
    }
    try {
      await query('UPDATE transports SET price_converted = $1, price_converted_currency = $2 WHERE id = $3', [Number(converted.toFixed(2)), mainCurrency, t.id]);
    } catch (_) {}
    sumTrans += converted;
  }

  let sumAttr = 0;
  for (const s of stopsRes.rows) {
    const attrRes = await query('SELECT * FROM attractions WHERE stop_id = $1', [s.id]);
    for (const a of attrRes.rows) {
      const cost = parseFloat(a.estimated_cost || 0) || 0;
      const curr = a.currency || mainCurrency;
      let converted = cost;
      if (cost && curr !== mainCurrency) {
        try {
          converted = await convertCurrency(cost, curr, mainCurrency);
        } catch (e) {
          converted = cost;
        }
      }
      try {
        await query('UPDATE attractions SET estimated_cost_converted = $1, estimated_cost_converted_currency = $2 WHERE id = $3', [Number(converted.toFixed(2)), mainCurrency, a.id]);
      } catch (_) {}
      sumAttr += converted;
    }
  }

  const total = sumStops + sumTrans + sumAttr;
  await query('UPDATE journeys SET total_estimated_cost = $1 WHERE id = $2', [total, journeyId]);
  return total;
};
