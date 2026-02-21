import express from 'express';
import { getRates as loadRatesCache, getCachedRates, forceRefresh } from '../services/currencyService';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// GET /api/currency/rates?base=USD - returns cached rates if present; if missing,
// fetches upstream once and stores the result. NOTE: this endpoint will not
// automatically refresh cached entries that already exist (app uses cached values).
router.get('/rates', async (req, res) => {
  try {
    const base = (req.query.base as string) || 'PLN';
    // Try to return cached only
    const cacheOnly = await getCachedRates(base);
    if (cacheOnly) {
      return res.json({ base: cacheOnly.base, timestamp: cacheOnly.timestamp, rates: cacheOnly.rates, cached: true });
    }
    // If cache missing for requested base, fetch once from upstream and persist
    const cache = await loadRatesCache(base); // loadRatesCache will fetch when missing
    return res.json({ base: cache.base, timestamp: cache.timestamp, rates: cache.rates, cached: false });
  } catch (err: any) {
    console.error('Failed to get rates:', err);
    return res.status(500).json({ message: 'Failed to get rates' });
  }
});

// POST /api/currency/refresh - force refresh rates from upstream (admin only)
router.post('/refresh', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const base = (req.body.base as string) || 'PLN';
    const refreshed = await forceRefresh(base);
    return res.json({ message: 'Refreshed', base: refreshed.base, timestamp: refreshed.timestamp });
  } catch (err: any) {
    console.error('Failed to refresh rates:', err);
    return res.status(500).json({ message: 'Failed to refresh rates' });
  }
});

export default router;
