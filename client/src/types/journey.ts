export interface Stop {
  id?: number;
  journeyId?: number;
  city: string;
  country: string;
  addressStreet?: string; // street name
  addressHouseNumber?: string; // house number
  postalCode?: string; // postal / ZIP code
  latitude: number;
  longitude: number;
  arrivalDate: Date | string;
  departureDate: Date | string;
  accommodationName?: string;
  accommodationUrl?: string;
  accommodationPrice?: number;
  accommodationCurrency?: string;
  notes?: string;
  attractions?: Attraction[];
  isPaid?: boolean;
  checkInTime?: string;  // HH:MM format for accommodation check-in
  checkOutTime?: string; // HH:MM format for accommodation check-out
  orderIndex?: number;   // For sorting within journey
}

export interface Transport {
  id?: number;
  type: 'flight' | 'train' | 'bus' | 'car' | 'other';
  fromLocation: string;
  toLocation: string;
  departureDate: Date | string;
  arrivalDate: Date | string;
  price: number;
  currency: string;
  bookingUrl?: string;
  notes?: string;
  flightNumber?: string;  // For flights (e.g., "LO123")
  trainNumber?: string;   // For trains (e.g., "TLK 12345")
  isPaid?: boolean;
}

export interface Attraction {
  id?: number;
  stopId?: number;
  name: string;
  description?: string;
  estimatedCost?: number;
  currency?: string;
  duration?: string; // e.g., "2 hours", "30 minutes"
  isPaid?: boolean;
  address?: string;      // Full address (legacy - for display/concatenated)
  addressStreet?: string;    // Street name and number
  addressCity?: string;      // City name
  addressPostalCode?: string; // Postal/ZIP code
  addressCountry?: string;    // Country name
  latitude?: number;     // Latitude coordinate for map marker (auto-filled)
  longitude?: number;    // Longitude coordinate for map marker (auto-filled)
  visitTime?: string;    // HH:MM format for planned visit time
  openingTime?: string;  // HH:MM format for opening time
  closingTime?: string;  // HH:MM format for closing time
  orderIndex?: number;   // For sorting within stop
  priority?: 'must' | 'should' | 'could' | 'skip'; // Priority level for itinerary planning
  plannedDate?: string;  // YYYY-MM-DD format for scheduled date
  plannedTime?: string;  // HH:MM format for scheduled time
  tag?: 'beauty' | 'cafe' | 'must_see' | 'accommodation' | 'nature' | 'airport' | 'food' | 'attraction' | 'train_station'; // Category tag
}

export interface JourneyShare {
  id: number;
  journeyId: number;
  sharedWithUserId?: number;
  sharedByUserId: number;
  status: 'pending' | 'accepted' | 'rejected';
  invitedEmail?: string;
  invitationToken?: string;
  createdAt: Date | string;
  acceptedAt?: Date | string;
  rejectedAt?: Date | string;
  role?: 'view' | 'edit' | 'manage';
  // Additional fields from joined queries
  journeyTitle?: string;
  journeyDescription?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  sharedByUsername?: string;
  sharedByEmail?: string;
  sharedWithUsername?: string;
}

export interface Journey {
  id?: number;
  title: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  stops?: Stop[];
  transports?: Transport[];
  // Checklist for packing/shopping per journey
  checklist?: ChecklistItem[];
  totalEstimatedCost?: number;
  currency: string;
  createdBy?: number;
  isShared?: boolean; // Flag indicating if journey is shared with current user
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ChecklistItem {
  id: string; // client-generated UUID or unique key
  name: string;
  bought?: boolean; // whether item is already bought
  packed?: boolean; // whether item is packed
}

export type TransportType = 'flight' | 'train' | 'bus' | 'car' | 'other';
