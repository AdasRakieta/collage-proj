const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  console.error('Data directory not found:', dataDir);
  process.exit(1);
}
const read = (name) => {
  try {
    const txt = fs.readFileSync(path.join(dataDir, name), 'utf8');
    return JSON.parse(txt || '[]');
  } catch (e) {
    return [];
  }
};
const write = (name, data) => {
  fs.writeFileSync(path.join(dataDir, name), JSON.stringify(data, null, 2), 'utf8');
};

const exchange = (() => {
  try {
    const txt = fs.readFileSync(path.join(dataDir, 'exchange_rates.json'), 'utf8');
    return JSON.parse(txt || '{}');
  } catch (e) {
    return {};
  }
})();

function getRate(from, to) {
  if (!from || !to) return 1;
  if (from === to) return 1;
  // Prefer direct base if available
  if (exchange[from] && exchange[from].rates && exchange[from].rates[to]) {
    return exchange[from].rates[to];
  }
  // If there is a rates set for 'USD', use USD as intermediary
  const usd = exchange['USD'] && exchange['USD'].rates ? exchange['USD'].rates : null;
  if (usd) {
    const rateFrom = usd[from];
    const rateTo = usd[to];
    if (rateFrom != null && rateTo != null) return (1 / rateFrom) * rateTo;
  }
  // If there is a rates set for 'PLN', try using it
  const pln = exchange['PLN'] && exchange['PLN'].rates ? exchange['PLN'].rates : null;
  if (pln) {
    const rateFrom = pln[from];
    const rateTo = pln[to];
    if (rateFrom != null && rateTo != null) return (1 / rateFrom) * rateTo;
  }
  // Give up and return 1
  return 1;
}

function convert(amount, from, to) {
  const rate = getRate(from, to);
  return amount * rate;
}

function recompute() {
  const journeys = read('journeys.json');
  const stops = read('stops.json');
  const transports = read('transports.json');
  const attractions = read('attractions.json');

  for (const j of journeys) {
    const main = j.currency || 'PLN';
    const jsStops = stops.filter(s => s.journey_id === j.id);
    let sumStops = 0;
    for (const s of jsStops) {
      const price = Number(s.accommodation_price || 0) || 0;
      const curr = s.accommodation_currency || main;
      const conv = convert(price, curr, main) || price;
      s.accommodation_price_converted = Number(conv.toFixed(2));
      s.accommodation_price_converted_currency = main;
      sumStops += conv;
    }

    const jsTrans = transports.filter(t => t.journey_id === j.id);
    let sumTrans = 0;
    for (const t of jsTrans) {
      const price = Number(t.price || 0) || 0;
      const curr = t.currency || main;
      const conv = convert(price, curr, main) || price;
      t.price_converted = Number(conv.toFixed(2));
      t.price_converted_currency = main;
      sumTrans += conv;
    }

    let sumAttr = 0;
    for (const a of attractions) {
      // attraction.stop_id references stops
      const stop = stops.find(s => s.id === a.stop_id);
      if (!stop) continue;
      if (stop.journey_id !== j.id) continue;
      const price = Number(a.estimated_cost || 0) || 0;
      const curr = a.currency || main;
      const conv = convert(price, curr, main) || price;
      a.estimated_cost_converted = Number(conv.toFixed(2));
      a.estimated_cost_converted_currency = main;
      sumAttr += conv;
    }

    const total = sumStops + sumTrans + sumAttr;
    j.total_estimated_cost = Number(total.toFixed(2));
    console.log(`Journey ${j.id} => total ${j.total_estimated_cost} ${main}`);
  }

  // write updated item files with converted fields
  write('stops.json', stops);
  write('transports.json', transports);
  write('attractions.json', attractions);
  write('journeys.json', journeys);
  console.log('Wrote updated journeys.json');
}

recompute();
