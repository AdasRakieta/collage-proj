import express from 'express';
const router = express.Router();

// Use require to avoid potential TS type mismatches with puppeteer types
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Reuse a small whitelist to avoid open rendering abuse
const ALLOWED_HOSTS = new Set([
  'www.google.com',
  'maps.google.com',
  'www.googleusercontent.com',
  'storage.googleapis.com',
  'maps.app.goo.gl'
]);

router.get('/render', async (req, res) => {
  const target = String(req.query.url || '');
  if (!target) return res.status(400).json({ error: 'Missing url parameter' });

  let parsed: URL;
  try { parsed = new URL(target); } catch (e) { return res.status(400).json({ error: 'Invalid url' }); }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return res.status(403).json({ error: 'Host not allowed by renderer', host: parsed.hostname });
  }


  // Helper: recursively follow consent/continue redirects and try extraction
  async function renderWithRedirects(
    page: any,
    url: string,
    depth: number = 0,
    chain: string[] = []
  ): Promise<{ html: string; extracted: any[] | null; chain: string[] }> {
    if (depth > 3) return { html: '', extracted: [], chain };
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch((err: any) => { console.warn('page.goto warning', err && err.message || String(err)); });
    await new Promise((resolve) => setTimeout(resolve, 3500));
    let html: string = await page.content();
    (chain as string[]).push(page.url());
    // Try to accept consent if present (loop up to 4 times)
    let didConsent = false;
    let consentAttempts = 0;
    while (consentAttempts < 4) {
      try {
        const isConsent = html.includes('consent.google.com') || /consent/i.test(html);
        if (!isConsent) break;
        console.log(`proxyRender: consent page detected, attempt ${consentAttempts + 1}`);
        const clicked = await page.evaluate(`(function(){
          try {
            // Rozszerzony regex na wszystkie warianty zgody
            const acceptRegex = /agree|accept|akcept|zgadzam|allow|ta?k|zaakceptuj|accept all|allow all|accept everything|zaakceptuj wszystko/i;
            const candidates = Array.from(document.querySelectorAll('button, input, a, div'));
            for (var i=0;i<candidates.length;i++){
              try{
                var el = candidates[i];
                var text = (el.textContent || (el.value || '')).toString().trim();
                if (text && acceptRegex.test(text)){
                  if (typeof el.click === 'function') el.click();
                  return true;
                }
              }catch(e){}
            }
          }catch(e){}
          return false;
        })()`);
        if (clicked) {
          didConsent = true;
          console.log('proxyRender: clicked consent button, waiting for navigation');
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
          await new Promise((r) => setTimeout(r, 2500));
          html = await page.content();
          (chain as string[]).push(page.url());
        } else {
          console.log('proxyRender: no consent button clicked');
          break;
        }
      } catch (e) {
        console.warn('proxyRender: consent handling error', (e && (e as any).message) || String(e));
        break;
      }
      consentAttempts++;
    }
    // If still on consent.google.com and continue param exists, open in new page recursively
    try {
      const cu = new URL(page.url());
      if (cu.hostname && cu.hostname.includes('consent.google.com')) {
        const cont = cu.searchParams.get('continue');
        if (cont) {
          try {
            const decoded = decodeURIComponent(cont);
            console.log('proxyRender: navigating to decoded continue URL in new page');
            const newPage = await page.browser().newPage();
            await newPage.setUserAgent(await page.browser().userAgent || 'Mozilla/5.0');
            const result = await renderWithRedirects(newPage, decoded, depth + 1, chain);
            await newPage.close();
            return result;
          } catch (e) {}
        }
      }
    } catch (e) {}
    return { html, extracted: null, chain };
  }

  let browser: any = null;
  try {
    console.log('proxyRender: launching browser for', target);
    browser = await puppeteer.launch({
      headless: false, // headful - pojawi się okno Chrome
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // Ścieżka do pliku cookies
    const cookiesPath = path.join(__dirname, 'cookies.json');
    // Jeśli plik cookies istnieje, wczytaj je
    if (fs.existsSync(cookiesPath)) {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath, 'utf-8'));
      await page.setCookie(...cookies);
      console.log('proxyRender: cookies loaded from file');
    } else {
      // Pierwsze uruchomienie: pozwól użytkownikowi zalogować się i zaakceptować consent
      console.log('proxyRender: czekam 30 sekund na ręczną interakcję (login/consent) w oknie Chrome...');
      await page.goto(target, { waitUntil: 'networkidle2', timeout: 45000 }).catch((err: any) => { console.warn('page.goto warning', err && err.message || String(err)); });
      await new Promise(r => setTimeout(r, 30000)); // 30 sekund na ręczne kliknięcie
      const cookies = await page.cookies();
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('proxyRender: cookies saved to file. Zamknij okno Chrome i uruchom ponownie backend, by korzystać z automatycznego scrapowania.');
      await browser.close();
      return res.json({ info: 'Cookies saved. Restart backend to use them for automatic extraction.' });
    }

    // Recursively follow consent/continue redirects
    let html: string, preExtracted: any[] | null, chain: string[];
    ({ html, extracted: preExtracted, chain } = await renderWithRedirects(page, target, 0, []));

    // If we did not find features yet, poll for dynamic map content for up to 15s
    try {
      let found = false;
      const maxMs = 15000;
      const start = Date.now();
      while (Date.now() - start < maxMs) {
        // check for hrefs with @lat,lng or /place/ or /maps/place
        const counts = await page.evaluate(`(function(){
          try{ return {
            atHrefs: document.querySelectorAll('a[href*="@"]').length,
            placeHrefs: document.querySelectorAll('a[href*="/place"], a[href*="/maps/place"], a[href*="/maps/preview"]').length,
            listItems: document.querySelectorAll('[role="article"], [data-result-index]').length
          }; }catch(e){ return {atHrefs:0, placeHrefs:0, listItems:0}; }
        })()`);
        const total = (counts && (counts.atHrefs||0) + (counts.placeHrefs||0) + (counts.listItems||0)) || 0;
        if (total > 0) { found = true; break; }
        await new Promise(r => setTimeout(r, 1000));
      }
      if (found) {
        html = await page.content();
        console.log('proxyRender: dynamic content appeared, re-checking extraction');
      } else {
        console.log('proxyRender: polling finished, no dynamic list detected');
      }
    } catch (e) { }

    // debug: count anchors and ld scripts
    try {
      const anchorCount = await page.evaluate(`(function(){return document.querySelectorAll('a[href]').length})()`).catch(() => 0 as any);
      const ldCount = await page.evaluate(`(function(){return document.querySelectorAll('script[type="application/ld+json"]').length})()`).catch(() => 0 as any);
      console.log('proxyRender: debug counts anchors=', anchorCount, 'ldScripts=', ldCount);
    } catch (e) {}

    // Try to extract coordinates from rendered DOM (links with @lat,lng or hrefs)
    let extracted: any[] = [];
    if (preExtracted && Array.isArray(preExtracted)) {
      extracted = preExtracted;
    } else {
      // Nowa ekstrakcja: szukaj miejsc po klasach .Nv2PK i .hfpxzc (typowe dla listy miejsc)
      const evalScript = `(() => {
        const results = [];
        try {
          // 1) anchors with @lat,lng
          const anchors = Array.from(document.querySelectorAll('a[href]'));
          const atRegex = /@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/;
          anchors.forEach(a => {
            try {
              const href = a.href || a.getAttribute('href');
              const m = href && href.match(atRegex);
              if (m) results.push({ name: (a.textContent || null), lat: Number(m[1]), lng: Number(m[2]), raw: href });
            } catch (e) {}
          });

          // 2) JSON-LD scripts
          const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent).filter(Boolean);
          ldScripts.forEach(js => {
            try {
              const parsed = JSON.parse(js);
              const arr = Array.isArray(parsed) ? parsed : [parsed];
              arr.forEach(e => {
                try {
                  if (e && (e['@type'] === 'Place' || e['@type'] === 'LocalBusiness' || e.geo)) {
                    const lat = e.geo && (e.geo.latitude || e.geo.lat || (e.geo.coordinates && e.geo.coordinates[1]));
                    const lng = e.geo && (e.geo.longitude || e.geo.lng || (e.geo.coordinates && e.geo.coordinates[0]));
                    if (lat && lng) results.push({ name: e.name || null, lat: Number(lat), lng: Number(lng), raw: e });
                  }
                } catch (e) {}
              });
            } catch (e) {}
          });

          // 3) window globals / bootstrapped data - attempt to stringify and find @lat,lng
          try {
            const candidates = [];
            try { candidates.push(window.APP_INITIALIZATION_STATE); } catch(e) {}
            try { candidates.push(window.__INITIAL_DATA__); } catch(e) {}
            try { candidates.push(window.APP_STATIC_DATA); } catch(e) {}
            try { candidates.push(window.__PRELOADED_STATE__); } catch(e) {}
            candidates.forEach(cand => {
              try {
                if (!cand) return;
                const s = typeof cand === 'string' ? cand : JSON.stringify(cand);
                const rg = /@(-?\\d+\\.\\d+),(-?\\d+\\.\\d+)/g;
                let m;
                while ((m = rg.exec(s))) {
                  results.push({ name: null, lat: Number(m[1]), lng: Number(m[2]), raw: 'fromWindow' });
                }
              } catch(e){}
            });
          } catch(e){}

          // 4) Nowość: wyciągnij miejsca z panelu bocznego po klasach .Nv2PK i .hfpxzc
          try {
            const items = Array.from(document.querySelectorAll('.Nv2PK, .hfpxzc'));
            items.forEach(el => {
              try {
                // Szerszy wybór selektorów dla nazw
                let name = null;
                const nameSelectors = [
                  '.qBF1Pd', // główna nazwa
                  '.fontHeadlineSmall',
                  '.DUwDvf',
                  '.lI9IFe',
                  'a',
                ];
                for (const sel of nameSelectors) {
                  const n = el.querySelector(sel);
                  if (n && n.textContent && n.textContent.trim().length > 0) {
                    name = n.textContent.trim();
                    break;
                  }
                }
                if (!name) name = el.textContent?.trim() || null;

                // Link do szczegółów miejsca (może nie być współrzędnych)
                const link = el.querySelector('a[href]')?.href || null;

                // Zwróć raw innerText do debugowania
                results.push({ name, link, raw: el.innerText });
              } catch(e){}
            });
            // Loguj liczbę znalezionych elementów
            results.push({ debug: 'sidepanel_places_count', count: items.length });
          } catch(e){}

        } catch (e) {}
        return results;
      })()`;
      try {
        extracted = await page.evaluate(evalScript as any).catch((err: any) => { console.warn('evaluate failed', (err && (err as any).message) || String(err)); return []; });
      } catch (e) {
        console.warn('page.evaluate exception', (e && (e as any).message) || String(e));
        extracted = [];
      }
    }

    // As fallback, run regex on html to find @lat,lng patterns
    const fallback: any[] = [];
    try {
      const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/g;
      let m: RegExpExecArray | null;
      const seen = new Set<string>();
      while ((m = atRegex.exec(html))) {
        const lat = Number(m[1]);
        const lng = Number(m[2]);
        const key = `${lat}:${lng}`;
        if (seen.has(key)) continue;
        seen.add(key);
        fallback.push({ name: null, lat, lng, raw: m[0] });
      }
    } catch (e) { /* ignore */ }

    const merged = [...(extracted || [])];
    for (const f of fallback) {
      if (!merged.find((x: any) => Math.abs(x.lat - f.lat) < 1e-6 && Math.abs(x.lng - f.lng) < 1e-6)) merged.push(f);
    }

    console.log('proxyRender: extracted count', merged.length);
    // add some snippet logging if nothing found to help debugging
    if (!merged.length) {
      console.warn('proxyRender: no features extracted, html snippet:', html.slice(0, 200));
    }

    // If still nothing, dump first 8KB of HTML and redirect chain for debugging
    res.json({
      htmlSnippet: html.slice(0, 8192),
      extracted: merged,
      redirectChain: chain
    });
  } catch (err) {
    console.error('Render error', err);
    res.status(500).json({ error: 'Render failed' });
  } finally {
    try { if (browser) await browser.close(); } catch (e) {}
  }
});

export default router;
