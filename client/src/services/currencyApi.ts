const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const base = API_URL;

export async function getRates(baseCurrency = 'USD') {
  const res = await fetch(`${base}/currency/rates?base=${encodeURIComponent(baseCurrency)}`);
  if (!res.ok) throw new Error('Failed to fetch rates');
  return res.json();
}

export async function refreshRates(baseCurrency = 'USD') {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${base}/currency/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
    body: JSON.stringify({ base: baseCurrency })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to refresh rates');
  }
  return res.json();
}
