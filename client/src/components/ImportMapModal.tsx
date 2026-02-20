import React, { useState } from 'react';
import { X, UploadCloud } from 'lucide-react';

// Minimal types
interface Feature { name?: string; description?: string; lat?: number; lng?: number }

interface ParsedFeature extends Feature {
  address?: string;
  phone?: string;
  website?: string;
  raw?: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (result: { createdStops: any[]; createdAttractions: any[] }) => void;
  selectedJourneyId: number | null;
  existingStops: any[];
}

// Haversine distance in meters
const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371000;
  const toRad = (v: number) => v * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const parseKML = (text: string): Feature[] => {
  try {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const placemarks = Array.from(doc.querySelectorAll('Placemark'));
    return placemarks.map(pm => {
      const name = pm.querySelector('name')?.textContent?.trim() || '';
      const desc = pm.querySelector('description')?.textContent?.trim() || '';
      const coord = pm.querySelector('Point > coordinates')?.textContent?.trim()
        || pm.querySelector('coordinates')?.textContent?.trim() || '';
      // coordinates are lon,lat[,alt]
      const parts = coord.split(',').map(s => s.trim()).filter(Boolean);
      const lng = parts[0] ? Number(parts[0]) : undefined;
      const lat = parts[1] ? Number(parts[1]) : undefined;
      return { name, description: desc, lat, lng };
    }).filter(f => f.lat != null && f.lng != null);
  } catch (e) {
    return [];
  }
}

const parseGeoJSON = (text: string): Feature[] => {
  try {
    const obj = JSON.parse(text);
    const features = obj.type === 'FeatureCollection' ? obj.features : (obj.type === 'Feature' ? [obj] : []);
    return features.map((f: any) => {
      const coords = f.geometry?.coordinates || (f.geometry?.type === 'Point' ? f.geometry.coordinates : null);
      let lng, lat;
      if (Array.isArray(coords)) { lng = coords[0]; lat = coords[1]; }
      const name = f.properties?.name || f.properties?.title || f.properties?.label || '';
      const description = f.properties?.description || '';
      return { name, description, lat, lng };
    }).filter((f: any) => f.lat != null && f.lng != null);
  } catch (e) {
    return [];
  }
}

const tryExtractFromGoogleMapsHtml = (html: string): Feature[] => {
  // Best-effort: look for place links with @lat,lng in them (some google maps links contain @lat,lng)
  const features: Feature[] = [];
  try {
    // Find all occurrences of '/place/...' or '/maps/place/...' and look ahead for @lat,lng
    const atRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/g;
    let m: RegExpExecArray | null;
    const seen = new Set<string>();
    while ((m = atRegex.exec(html))) {
      const lat = Number(m[1]);
      const lng = Number(m[2]);
      const key = `${lat}:${lng}`;
      if (seen.has(key)) continue;
      seen.add(key);
      features.push({ name: `Imported place ${lat.toFixed(5)},${lng.toFixed(5)}`, lat, lng });
    }
  } catch (e) {
    // ignore
  }
  return features;
}

const ImportMapModal: React.FC<Props> = ({ isOpen, onClose, onImportComplete, selectedJourneyId, existingStops }) => {
  const [url] = useState(''); // setUrl commented out - unused
  const [fileText, setFileText] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [radiusMeters, setRadiusMeters] = useState<number>(100);

  const [parsedFeatures, setParsedFeatures] = useState<ParsedFeature[] | null>(null);
  const [assignments, setAssignments] = useState<Record<number, number | 'new'>>({});
  const [autoMode, setAutoMode] = useState<'off' | 'nearest' | 'name'>('nearest');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_canTryRender, setCanTryRender] = useState(false);

  if (!isOpen) return null;

  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFileText(String(reader.result || ''));
    };
    reader.readAsText(file);
  }

  const doImport = async () => {
    setStatus('Parsing...');
    let features: Feature[] = [];
    let htmlText: string | null = null;
    if (fileText) {
      // try geojson then kml
      features = parseGeoJSON(fileText);
      if (!features || features.length === 0) features = parseKML(fileText);
    } else if (url) {
      setStatus('Fetching URL via server proxy (avoids CORS)');
      try {
        const proxyUrl = `/api/proxy/fetch?url=${encodeURIComponent(url)}`;
        const resp = await fetch(proxyUrl);
        const text = await resp.text();
        htmlText = text;
        // try geojson
        features = parseGeoJSON(text);
        if (!features || features.length === 0) features = parseKML(text);
        if (!features || features.length === 0) features = tryExtractFromGoogleMapsHtml(text);
        // Additionally try JSON-LD extraction from HTML
        if ((!features || features.length === 0) && text) {
          try {
            const doc = new DOMParser().parseFromString(text, 'text/html');
            const ld = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent).filter(Boolean);
            for (const js of ld) {
              try {
                const parsed = JSON.parse(js as string);
                // Support arrays
                const entries = Array.isArray(parsed) ? parsed : [parsed];
                for (const e of entries) {
                  if (e && (e['@type'] === 'Place' || e.geo || e['@type'] === 'Map')) {
                    const name = e.name || e.title || '';
                    const desc = e.description || '';
                    const lat = e.geo?.latitude || e.geo?.lat || (e.geo?.coordinates && e.geo.coordinates[1]);
                    const lng = e.geo?.longitude || e.geo?.lng || (e.geo?.coordinates && e.geo.coordinates[0]);
                    if (lat && lng) features.push({ name, description: desc, lat: Number(lat), lng: Number(lng) });
                    else if (e.hasMap && e.hasMap.geo) {
                      // skip complex
                    }
                  }
                }
              } catch (err) { /* ignore json-ld parse errors */ }
            }
          } catch (err) { /* ignore */ }
        }
      } catch (e: any) {
        setStatus('Failed to fetch URL from browser (CORS). Please export KML/GeoJSON from Google My Maps and upload the file instead.');
        return;
      }
    } else {
      setStatus('Please provide a file or a link');
      return;
    }

    if (!features || features.length === 0) { setStatus('No features found in the provided input'); setCanTryRender(true); return; }
    setCanTryRender(false);

    // Build parsed features with additional metadata from HTML when available
    const parsed: ParsedFeature[] = features.map(f => ({ ...f, raw: null }));

    if (htmlText) {
      try {
        const doc = new DOMParser().parseFromString(htmlText, 'text/html');
        // try to extract place containers, titles and addresses
        const placeNames = Array.from(doc.querySelectorAll('[data-place-id], .section-hero-header-title, h1, h2'))
          .map(el => el.textContent?.trim()).filter(Boolean) as string[];
        // assign some text fragments to parsed features heuristically
        for (let i = 0; i < parsed.length; i++) {
          const p = parsed[i];
          p.raw = null;
          // try JSON-LD again for richer info
          const ld = Array.from(doc.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent).filter(Boolean);
          for (const js of ld) {
            try {
              const parsedJson = JSON.parse(js as string);
              const entries = Array.isArray(parsedJson) ? parsedJson : [parsedJson];
              for (const e of entries) {
                if (e && (e['@type'] === 'Place' || e['@type'] === 'LocalBusiness' || e['@type'] === 'TouristAttraction')) {
                  const lat = e.geo?.latitude || e.geo?.lat || (e.geo?.coordinates && e.geo.coordinates[1]);
                  const lng = e.geo?.longitude || e.geo?.lng || (e.geo?.coordinates && e.geo.coordinates[0]);
                  if (lat && lng && Math.abs(Number(lat) - (p.lat||0)) < 0.5 && Math.abs(Number(lng) - (p.lng||0)) < 0.5) {
                    p.name = p.name || e.name;
                    p.description = p.description || e.description;
                    p.address = p.address || (typeof e.address === 'object' ? (e.address as any)?.streetAddress : e.address);
                    p.phone = (p as any).telephone || p.phone || (e as any).telephone;
                    p.website = (p as any).url || p.website || (e as any).url;
                    p.raw = e;
                  }
                }
              }
            } catch (err) { /* ignore */ }
          }
          // fallback: use found headings
          if (!p.name && placeNames[i]) p.name = placeNames[i];
        }
      } catch (e) { /* ignore */ }
    }

    setParsedFeatures(parsed);
    // initialize assignments (default: nearest within radius -> assign stopId else 'new')
    const initAssign: Record<number, number | 'new'> = {};
    for (let i = 0; i < parsed.length; i++) {
      let assigned: number | 'new' = 'new';
      if (existingStops && existingStops.length > 0) {
        let nearest: any = null; let best = Infinity;
        for (const s of existingStops) {
          if (!s.latitude || !s.longitude) continue;
          const d = distanceMeters(parsed[i].lat!, parsed[i].lng!, Number(s.latitude), Number(s.longitude));
          if (d < best) { best = d; nearest = s; }
        }
        if (nearest && best <= radiusMeters) assigned = nearest.id;
      }
      initAssign[i] = assigned;
    }
    setAssignments(initAssign);
    setStatus(`Parsed ${parsed.length} places — review and assign before importing`);
    return;
  }

  const applyImport = async () => {
    if (!parsedFeatures || parsedFeatures.length === 0) return;
    // TODO: Fix imports when services are available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const stopService = (await import('../services/api')).stopService;
    // eslint-disable-next-line @typescript-eslint/no-var-requires  
    const attractionService = (await import('../services/api')).attractionService;
    
    const createdStops: any[] = [];
    const createdAttractions: any[] = [];
    if (selectedJourneyId == null) { setStatus('No journey selected'); return; }

    for (let i = 0; i < parsedFeatures.length; i++) {
      const pf = parsedFeatures[i];
      const assign = assignments[i];
      let targetStopId: number | null = null;
      if (assign === 'new') {
        // construct payload with as many fields as possible
        const payload: any = {
          city: pf.name || 'Imported place',
          country: '',
          latitude: pf.lat,
          longitude: pf.lng,
          accommodationName: pf.name || undefined,
          accommodationUrl: pf.website || undefined,
          notes: pf.description || undefined,
        };
        try {
          const created = await stopService.createStop(selectedJourneyId, payload);
          createdStops.push(created);
          targetStopId = created.id;
        } catch (e) {
          console.error('Failed to create stop', e);
        }
      } else {
        targetStopId = assign as number;
      }

      // create attraction under targetStopId if we have a stop id
      if (targetStopId) {
        try {
          const att = await attractionService.createAttraction(targetStopId, {
            name: pf.name || 'Imported',
            description: pf.description || pf.address || '',
            estimatedCost: 0,
            duration: 0,
          });
          createdAttractions.push(att);
        } catch (e) { console.error('Failed to create attraction', e); }
      }
    }

    setStatus('Import finished');
    onImportComplete({ createdStops, createdAttractions });
    onClose();
  }

  /* Commented out - unused feature
  const _tryServerRender = async () => {
    if (!url) { setStatus('No URL provided for server render'); return; }
    setStatus('Rendering page on server (may take a few seconds)...');
    try {
      const resp = await fetch(`/api/proxy/render?url=${encodeURIComponent(url)}`);
      if (!resp.ok) {
        await resp.text();
        setStatus(`Server render failed: ${resp.status}`);
        return;
      }
      const data = await resp.json();
      const features: Feature[] = (data.extracted || []).map((f: any) => ({ name: f.name || '', description: f.description || '', lat: f.lat, lng: f.lng }));
      if (!features || features.length === 0) { setStatus('Server render did not find any places'); return; }

      const parsed: ParsedFeature[] = features.map(f => ({ ...f, raw: null }));
      setParsedFeatures(parsed);
      const initAssign: Record<number, number | 'new'> = {};
      for (let i = 0; i < parsed.length; i++) {
        let assigned: number | 'new' = 'new';
        if (existingStops && existingStops.length > 0) {
          let nearest: any = null; let best = Infinity;
          for (const s of existingStops) {
            if (!s.latitude || !s.longitude) continue;
            const d = distanceMeters(parsed[i].lat!, parsed[i].lng!, Number(s.latitude), Number(s.longitude));
            if (d < best) { best = d; nearest = s; }
          }
          if (nearest && best <= radiusMeters) assigned = nearest.id;
        }
        initAssign[i] = assigned;
      }
      setAssignments(initAssign);
      setStatus(`Parsed ${parsed.length} places — review and assign before importing`);
    } catch (err) {
      setStatus('Server render failed');
    }
  }
  */

  const autoAssign = (mode: 'nearest' | 'name') => {
    if (!parsedFeatures) return;
    const next: Record<number, number | 'new'> = { ...assignments };
    for (let i = 0; i < parsedFeatures.length; i++) {
      const pf = parsedFeatures[i];
      if (mode === 'nearest' && existingStops && existingStops.length > 0) {
        let nearest: any = null; let best = Infinity;
        for (const s of existingStops) {
          if (!s.latitude || !s.longitude) continue;
          const d = distanceMeters(pf.lat!, pf.lng!, Number(s.latitude), Number(s.longitude));
          if (d < best) { best = d; nearest = s; }
        }
        if (nearest && best <= radiusMeters) next[i] = nearest.id; else next[i] = 'new';
      } else if (mode === 'name' && existingStops && existingStops.length > 0) {
        const name = (pf.name || '').toLowerCase();
        const found = existingStops.find(s => (s.city || '').toString().toLowerCase().includes(name) || (s.accommodationName || '').toString().toLowerCase().includes(name));
        next[i] = found ? found.id : 'new';
      }
    }
    setAssignments(next);
  }

  return (
    <div className="gh-modal-overlay" onClick={onClose}>
      <div className="gh-modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Import places from KML / GeoJSON</h2>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#2b2b2d]"><X className="w-4 h-4 text-black dark:text-white" /></button>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-white/90">Upload KML / GeoJSON file</label>
              <div className="flex items-center gap-3">
                <label className="gh-btn-secondary flex items-center gap-2 cursor-pointer">
                  <UploadCloud className="w-4 h-4" />
                  <span className="text-sm">Choose file</span>
                  <input type="file" accept=".kml,application/vnd.google-earth.kml+xml,application/json,application/geo+json,.geojson" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
                </label>
                <div className="text-sm text-gray-300 dark:text-gray-400">{fileText ? 'File loaded' : 'No file'}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-white/90">Match behavior</label>
              <div className="flex items-center gap-3">
                <label className="text-sm text-white/80">Assign to nearest existing stop within</label>
                <input type="number" value={radiusMeters} onChange={e => setRadiusMeters(Number(e.target.value || 0))} className="gh-input w-24 text-sm" />
                <span className="text-sm text-white/80">meters (0 = always create new stops)</span>
              </div>
            </div>

            <div className="text-sm text-gray-300 dark:text-gray-400">{status}</div>

            {!parsedFeatures ? (
              <div className="flex justify-end items-center gap-3 mt-4">
                <button onClick={() => { setParsedFeatures(null); setStatus(null); setAssignments({}); setCanTryRender(false); }} className="gh-btn-secondary">Reset</button>
                <button onClick={doImport} className="gh-btn-primary" disabled={!selectedJourneyId && !fileText}>Preview</button>
                <button onClick={onClose} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm">Cancel</button>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-white/80">Auto-assign:</label>
                  <select value={autoMode} onChange={e => setAutoMode(e.target.value as any)} className="gh-input w-40 text-sm">
                    <option value="nearest">Nearest (radius)</option>
                    <option value="name">By name</option>
                    <option value="off">Off</option>
                  </select>
                  <button onClick={() => autoAssign(autoMode === 'off' ? 'nearest' : (autoMode as 'nearest'|'name'))} className="gh-btn-secondary text-sm">Auto assign</button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {parsedFeatures.map((pf, idx) => (
                    <div key={idx} className="bg-white dark:bg-[#151517] rounded-lg p-3 border border-gray-200 dark:border-[#2b2b2d] flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <div className="font-semibold text-black dark:text-white truncate">{pf.name || `Place #${idx+1}`}</div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{pf.address || pf.description || `${pf.lat?.toFixed(5)}, ${pf.lng?.toFixed(5)}`}</div>
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-300">{pf.lat?.toFixed(5)}, {pf.lng?.toFixed(5)}</div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <select value={(assignments[idx] ?? 'new') as any} onChange={e => setAssignments(prev => ({ ...prev, [idx]: e.target.value === 'new' ? 'new' : Number(e.target.value) }))} className="gh-input w-60 text-sm">
                            <option value="new">Create new stop</option>
                            {(existingStops || []).map(s => (
                              <option key={s.id} value={s.id}>{(s.accommodationName || s.city || `Stop ${s.id}`)}</option>
                            ))}
                          </select>
                          {pf.website && <a href={pf.website} target="_blank" rel="noreferrer" className="text-sm text-blue-500">Website</a>}
                          {pf.phone && <span className="text-sm text-gray-500">{pf.phone}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end items-center gap-3">
                  <button onClick={() => { setParsedFeatures(null); setAssignments({}); setStatus(null); }} className="gh-btn-secondary">Back</button>
                  <button onClick={applyImport} className="gh-btn-primary">Apply import</button>
                </div>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImportMapModal;
