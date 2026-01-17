// Geocoding service using Nominatim (OpenStreetMap)
// Free API, no key required, but please respect rate limits

interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

/**
 * Geocode an address to coordinates using Nominatim API
 * @param street Street name and number
 * @param city City name
 * @param postalCode Postal/ZIP code
 * @param country Country name
 * @returns Coordinates and formatted address, or null if not found
 */
export async function geocodeAddress(
  street?: string,
  city?: string,
  postalCode?: string,
  country?: string
): Promise<GeocodingResult | null> {
  try {
    // Build address query parts
    const parts: string[] = [];
    if (street) parts.push(street);
    if (city) parts.push(city);
    if (postalCode) parts.push(postalCode);
    if (country) parts.push(country);

    if (parts.length === 0) {
      return null;
    }

    const query = parts.join(', ');
    
    // Nominatim API endpoint
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}` +
      `&format=json` +
      `&limit=1` +
      `&addressdetails=1`;

    // Add User-Agent header as required by Nominatim
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'JourneyPlanner/1.0',
      },
    });

    if (!response.ok) {
      console.error('Geocoding API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      console.warn('No geocoding results found for:', query);
      return null;
    }

    const result = data[0];
    
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Debounced geocoding function to avoid excessive API calls
 * Use this when geocoding on user input
 */
let geocodeTimeout: ReturnType<typeof setTimeout> | null = null;

export function geocodeAddressDebounced(
  street?: string,
  city?: string,
  postalCode?: string,
  country?: string,
  callback?: (result: GeocodingResult | null) => void,
  delayMs: number = 1000
): void {
  if (geocodeTimeout) {
    clearTimeout(geocodeTimeout);
  }

  geocodeTimeout = setTimeout(async () => {
    const result = await geocodeAddress(street, city, postalCode, country);
    if (callback) {
      callback(result);
    }
  }, delayMs);
}
