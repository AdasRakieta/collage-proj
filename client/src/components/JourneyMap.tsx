import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useTheme } from '../contexts/ThemeContext';
import { parseYMDToDate } from '../utils/date';

// Fix for default marker icons in React-Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom icon for stops (blue)
const stopIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBmaWxsPSIjMDA3QUZGIiBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDguOSAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIxLjQgMjUgMTIuNUMyNSA1LjYgMTkuNCAwIDEyLjUgMHptMCAxN2MtMi41IDAtNC41LTItNC41LTQuNXMyLTQuNSA0LjUtNC41IDQuNSAyIDQuNSA0LjUtMiA0LjUtNC41IDQuNXoiLz48L3N2Zz4=',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadow,
  shadowSize: [41, 41],
});

// Custom icon for attractions (red)
const attractionIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNSIgaGVpZ2h0PSI0MSIgdmlld0JveD0iMCAwIDI1IDQxIj48cGF0aCBmaWxsPSIjRkYzQjMwIiBkPSJNMTIuNSAwQzUuNiAwIDAgNS42IDAgMTIuNWMwIDguOSAxMi41IDI4LjUgMTIuNSAyOC41UzI1IDIxLjQgMjUgMTIuNUMyNSA1LjYgMTkuNCAwIDEyLjUgMHptMCAxN2MtMi41IDAtNC41LTItNC41LTQuNXMyLTQuNSA0LjUtNC41IDQuNSAyIDQuNSA0LjUtMiA0LjUtNC41IDQuNXoiLz48L3N2Zz4=',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: markerShadow,
  shadowSize: [41, 41],
});

interface Attraction {
  id?: number;
  name: string;
  description?: string;
  estimatedCost?: number;
  visitTime?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface Stop {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  arrivalDate?: Date | string;
  departureDate?: Date | string;
  accommodationName?: string;
  accommodationPrice?: number;
  accommodationCurrency?: string;
  isPaid?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  attractions?: Attraction[];
}

interface JourneyMapProps {
  locations: Stop[];
  onLocationClick?: (location: Stop) => void;
  onMapClick?: (lat: number, lng: number) => void;
  center?: [number, number];
  zoom?: number;
  journeyCurrency?: string | null;
  ratesCache?: any;
}

function LocationMarker({ onMapClick }: { onMapClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

// Helper to format date using local parsing for date-only strings
const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '';
  const d = parseYMDToDate(date) || new Date(String(date));
  if (!d || isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// Helper to format time
const formatTime = (time: string | undefined): string => {
  if (!time) return '';
  return time;
};

const JourneyMap: React.FC<JourneyMapProps> = ({
  locations,
  onLocationClick,
  onMapClick,
  center = [51.505, -0.09],
  zoom = 6,
  journeyCurrency = 'PLN',
  ratesCache = null,
}) => {
  const { theme } = useTheme();
  const [mapCenter] = useState<[number, number]>(center); // Only set once on mount

  // Choose tile layer based on theme - use lighter dark tiles
  const tileLayerUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  
  const tileLayerAttribution = theme === 'dark'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  // No more auto-centering - let user pan freely

  // Create polyline coordinates from stops (sorted by arrival date)
  const polylinePositions: [number, number][] = locations
    .filter(loc => loc.latitude && loc.longitude)
    .sort((a, b) => {
      if (!a.arrivalDate || !b.arrivalDate) return 0;
      const da = parseYMDToDate(a.arrivalDate) || new Date(a.arrivalDate as any);
      const db = parseYMDToDate(b.arrivalDate) || new Date(b.arrivalDate as any);
      return da.getTime() - db.getTime();
    })
    .map(loc => [loc.latitude, loc.longitude] as [number, number]);

  // Collect all attractions with coordinates
  const allAttractions: Array<Attraction & { stopCity?: string }> = [];
  locations.forEach(stop => {
    if (stop.attractions) {
      stop.attractions.forEach(attraction => {
        if (attraction.latitude && attraction.longitude) {
          allAttractions.push({ ...attraction, stopCity: stop.city });
        }
      });
    }
  });

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      style={{ height: '100%', width: '100%', borderRadius: '10px' }}
      className={`z-0 ${theme === 'dark' ? 'apple-dark-map' : ''}`}
    >
      <TileLayer
        key={`base-${theme}`}
        attribution={tileLayerAttribution}
        url={tileLayerUrl}
        className={theme === 'dark' ? 'dark-map-tiles' : ''}
      />
      {theme === 'dark' && (
        <TileLayer
          key={`labels-${theme}`}
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png"
          attribution=""
        />
      )}
      
      {onMapClick && <LocationMarker onMapClick={onMapClick} />}
      
      {/* Polyline connecting stops */}
      {polylinePositions.length > 1 && (
        <Polyline
          positions={polylinePositions}
          pathOptions={{
            color: theme === 'dark' ? '#007AFF' : '#0066CC',
            weight: 3,
            opacity: 0.7,
            dashArray: '10, 5',
          }}
        />
      )}
      
      {/* Stop markers (blue) */}
      {locations.filter(loc => loc.latitude != null && loc.longitude != null).map((location, index) => (
        <Marker
          key={`stop-${index}`}
          position={[location.latitude, location.longitude]}
          icon={stopIcon}
          eventHandlers={{
            click: () => onLocationClick && onLocationClick(location),
          }}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
              <strong className="text-base dark:text-white">{location.city || 'Unknown Location'}</strong>
              {location.country && <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{location.country}</p>}
              
              {location.accommodationName && (
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <p className="font-medium text-xs text-gray-700 dark:text-gray-300">🏨 {location.accommodationName}</p>
                  {location.accommodationPrice != null && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      <span className="font-medium">Price:</span> {location.accommodationPrice} {(location as any).accommodationCurrency || 'PLN'}{(location as any).isPaid ? ' • Paid' : ''}
                      {(location as any).accommodationPrice && (location as any).accommodationCurrency && journeyCurrency && ((location as any).accommodationCurrency !== journeyCurrency) && (
                        (() => {
                          try {
                            const rates = ratesCache?.rates || {};
                            const from = (location as any).accommodationCurrency;
                            const to = journeyCurrency || 'PLN';
                            const rateFrom = rates[from];
                            const rateTo = rates[to];
                            if (from === to || rateFrom == null || rateTo == null) return null;
                            const conv = (1 / rateFrom) * rateTo * (location as any).accommodationPrice;
                            return ` ≈ ${conv.toFixed(2)} ${to}`;
                          } catch (e) {
                            return ' (≈ conversion unavailable)';
                          }
                        })()
                      )}
                    </p>
                  )}
                </div>
              )}
              
              {(location.arrivalDate || location.departureDate) && (
                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                  {location.arrivalDate && (
                    <p>
                      <span className="font-medium">Arrival:</span> {formatDate(location.arrivalDate)}
                      {location.checkInTime && <span className="ml-1">at {formatTime(location.checkInTime)}</span>}
                    </p>
                  )}
                  {location.departureDate && (
                    <p>
                      <span className="font-medium">Departure:</span> {formatDate(location.departureDate)}
                      {location.checkOutTime && <span className="ml-1">at {formatTime(location.checkOutTime)}</span>}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      
      {/* Attraction markers (red) */}
      {allAttractions.map((attraction, index) => (
        <Marker
          key={`attraction-${index}`}
          position={[attraction.latitude!, attraction.longitude!]}
          icon={attractionIcon}
        >
          <Popup>
            <div className="text-sm min-w-[200px]">
              <strong className="text-base dark:text-white">🎯 {attraction.name}</strong>
              {attraction.stopCity && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{attraction.stopCity}</p>
              )}
              
              {attraction.address && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">📍 {attraction.address}</p>
              )}
              
              {attraction.description && (
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">{attraction.description}</p>
              )}
              
              {attraction.visitTime && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  <span className="font-medium">Visit time:</span> {formatTime(attraction.visitTime)}
                </p>
              )}
              
              {attraction.estimatedCost && attraction.estimatedCost > 0 && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  <span className="font-medium">Cost:</span> {attraction.estimatedCost} {(attraction as any).currency || 'PLN'}
                  { /* prefer server-side persisted converted value when available */ }
                  {((attraction as any).estimatedCostConverted != null) && (
                    ` ≈ ${(attraction as any).estimatedCostConverted.toFixed(2)} ${(attraction as any).estimatedCostConvertedCurrency || journeyCurrency || 'PLN'}`
                  )}
                  {((attraction as any).estimated_cost_converted == null) && (attraction as any).estimatedCost && (attraction as any).currency && journeyCurrency && ((attraction as any).currency !== journeyCurrency) && (
                    (() => {
                      try {
                        const rates = ratesCache?.rates || {};
                        const from = (attraction as any).currency;
                        const to = journeyCurrency || 'PLN';
                        const rateFrom = rates[from];
                        const rateTo = rates[to];
                        if (from === to || rateFrom == null || rateTo == null) return ' (≈ conversion unavailable)';
                        const conv = (1 / rateFrom) * rateTo * (attraction as any).estimatedCost;
                        return ` ≈ ${conv.toFixed(2)} ${to}`;
                      } catch (e) {
                        return ' (≈ conversion unavailable)';
                      }
                    })()
                  )}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default JourneyMap;
