import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const CACHE_FILE = path.join(DATA_DIR, 'exchange_rates.json');
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

interface RatesCache {
  base: string;
  timestamp: number; // ms
  rates: Record<string, number>;
}

type MultiRatesCache = Record<string, RatesCache>;

async function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function loadCache(base: string): Promise<RatesCache | null> {
  try {
    await ensureDataDir();
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as MultiRatesCache;
    return parsed[base] || null;
  } catch (err) {
    console.error('Failed to load exchange rates cache:', err);
    return null;
  }
}

async function saveCache(cache: RatesCache) {
  try {
    await ensureDataDir();
    let map: MultiRatesCache = {};
    if (fs.existsSync(CACHE_FILE)) {
      try {
        map = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) as MultiRatesCache;
      } catch (e) {
        map = {};
      }
    }
    map[cache.base] = cache;
    fs.writeFileSync(CACHE_FILE, JSON.stringify(map, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save exchange rates cache:', err);
  }
}

async function fetchLatestRates(base = 'PLN'): Promise<RatesCache> {
  // Prefer exchangerate-api.com if API key is configured (single request returns all conversion rates)
  const apiKey = process.env.EXCHANGERATE_API_KEY || '';
  let json: any = null;
  if (apiKey) {
    // v6 endpoint: https://v6.exchangerate-api.com/v6/YOUR-API-KEY/latest/USD
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${encodeURIComponent(base)}`;
    const res = await fetch(url, { timeout: 15000 });
    if (!res.ok) throw new Error(`Failed to fetch rates from exchangerate-api.com: ${res.status}`);
    json = await res.json();
  } else {
    // Fallback: exchangerate.host (no API key required)
    const url = `https://api.exchangerate.host/latest?base=${encodeURIComponent(base)}`;
    const res = await fetch(url, { timeout: 10000 });
    if (!res.ok) throw new Error(`Failed to fetch rates: ${res.status}`);
    json = await res.json();
  }

  // Normalize different providers
  const rates: Record<string, number> = json.conversion_rates || json.rates || json.rates || json.conversionRates || {};
  const cache: RatesCache = { base, timestamp: Date.now(), rates };
  await saveCache(cache);
  return cache;
}

export async function getRates(base = 'PLN'): Promise<RatesCache> {
  // Prefer cached values always. Only fetch from upstream when the requested base
  // is not present in the cache at all. This keeps the app using only cached data
  // unless a missing base is requested.
  const cache = await loadCache(base);
  if (cache && cache.base === base) {
    return cache;
  }
  try {
    const fetched = await fetchLatestRates(base);
    return fetched;
  } catch (err) {
    console.warn('Could not fetch latest rates, and no cache available', err);
    if (cache) return cache;
    // fallback minimal rates
    return { base, timestamp: Date.now(), rates: { [base]: 1 } };
  }
}

// Return the cached rates if present, but do NOT trigger an upstream fetch.
export async function getCachedRates(base = 'PLN'): Promise<RatesCache | null> {
  const cache = await loadCache(base);
  return cache || null;
}

export async function getRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  // Use USD as intermediary base for simplicity
  const base = 'USD';
  const cache = await getRates(base);
  const rates = cache.rates;
  const rateFrom = rates[from] ?? null;
  const rateTo = rates[to] ?? null;
  if (rateFrom == null || rateTo == null) {
    // Try fetching with different base
    try {
      const alt = await fetchLatestRates(from);
      const altRate = alt.rates[to];
      if (altRate) return altRate;
    } catch (e) {
      // ignore
    }
    throw new Error(`Rate not available for ${from} -> ${to}`);
  }
  // rates are relative to base (USD): 1 USD = rates[X]
  // so 1 FROM = (1 / rateFrom) USD, then USD -> TO multiply by rateTo
  const result = (1 / rateFrom) * rateTo;
  return result;
}

export async function convert(amount: number, from: string, to: string): Promise<number> {
  const rate = await getRate(from, to);
  return amount * rate;
}

export async function clearCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
  } catch (e) {
    console.error('Failed to clear exchange rates cache', e);
  }
}

export async function forceRefresh(base = 'PLN') {
  return fetchLatestRates(base);
}

let _autoRefreshTimer: NodeJS.Timeout | null = null;

/**
 * Start periodic refresh of exchange rates for given bases.
 * Defaults to refreshing once per CACHE_TTL_MS (1 hour) for common currencies used in the app.
 */
export function startAutoRefresh(options?: { intervalMs?: number; bases?: string[] }) {
  const intervalMs = options?.intervalMs ?? CACHE_TTL_MS;
  const bases = options?.bases ?? ['PLN'];

  // Run immediately once
  (async () => {
    for (const b of bases) {
      try {
        await fetchLatestRates(b);
        console.log(`🔁 Currency rates fetched for base=${b}`);
      } catch (e) {
        console.warn(`⚠️ Failed to fetch rates for base=${b}:`, e);
      }
    }
  })();

  // Clear previous timer if any
  if (_autoRefreshTimer) clearInterval(_autoRefreshTimer);

  _autoRefreshTimer = setInterval(() => {
    for (const b of bases) {
      fetchLatestRates(b).then(() => {
        console.log(`🔁 Currency rates refreshed for base=${b}`);
      }).catch((err) => {
        console.warn(`⚠️ Failed to refresh rates for base=${b}:`, err.message || err);
      });
    }
  }, intervalMs);

  return _autoRefreshTimer;
}

export function stopAutoRefresh() {
  if (_autoRefreshTimer) {
    clearInterval(_autoRefreshTimer);
    _autoRefreshTimer = null;
  }
}
