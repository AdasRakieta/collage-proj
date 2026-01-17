import React, { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';

// Lazy load JourneyMap component to reduce initial bundle size
const JourneyMapLazy = lazy(() => import('./JourneyMap'));

// Stop interface matching JourneyMap expectations
interface Stop {
  id?: number;
  city?: string;
  country?: string;
  latitude: number;
  longitude: number;
  arrivalDate?: string | Date;
  departureDate?: string | Date;
  accommodationName?: string;
  accommodationPrice?: number;
  accommodationCurrency?: string;
  isPaid?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
  attractions?: Array<{
    id?: number;
    name: string;
    description?: string;
    estimatedCost?: number;
    currency?: string;
    visitTime?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }>;
}

// Props type matching JourneyMap
interface JourneyMapWrapperProps {
  locations: Stop[];
  onLocationClick?: (location: Stop) => void;
  onMapClick?: (lat: number, lng: number) => void;
  center?: [number, number];
  zoom?: number;
  journeyCurrency?: string | null;
  ratesCache?: any;
}

/**
 * Lazy-loaded wrapper for JourneyMap component
 * Reduces initial bundle size by code-splitting Leaflet and map dependencies
 */
const JourneyMapWrapper: React.FC<JourneyMapWrapperProps> = (props) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-600 dark:text-gray-400">Loading map...</p>
          </div>
        </div>
      }
    >
      <JourneyMapLazy {...props} />
    </Suspense>
  );
};

export default JourneyMapWrapper;
