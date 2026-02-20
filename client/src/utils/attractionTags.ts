// Tag definitions for attractions with corresponding emoji icons
// Maps tag values to display labels and emoji

export type AttractionTag = 
  | 'beauty' 
  | 'cafe' 
  | 'must_see' 
  | 'accommodation' 
  | 'nature' 
  | 'airport' 
  | 'food' 
  | 'attraction' 
  | 'train_station';

export interface AttractionTagInfo {
  value: AttractionTag;
  label: string;
  emoji: string;
  bgLight: string; // bg color for badge
  textColor: string; // text color
  borderColor: string; // border color
  markerColor: string; // hex color for map marker
}

export const ATTRACTION_TAGS: Record<AttractionTag, AttractionTagInfo> = {
  beauty: {
    value: 'beauty',
    label: 'Beauty & Spa',
    emoji: '🧖🏻‍♀️',
    bgLight: 'bg-pink-100 dark:bg-pink-900/20',
    textColor: 'text-pink-800 dark:text-pink-200',
    borderColor: 'border-pink-200 dark:border-pink-400/30',
    markerColor: '#db2777',
  },
  cafe: {
    value: 'cafe',
    label: 'Café',
    emoji: '☕️',
    bgLight: 'bg-amber-100 dark:bg-amber-900/20',
    textColor: 'text-amber-800 dark:text-amber-200',
    borderColor: 'border-amber-200 dark:border-amber-400/30',
    markerColor: '#f59e0b',
  },
  must_see: {
    value: 'must_see',
    label: 'Must See',
    emoji: '📷',
    bgLight: 'bg-purple-100 dark:bg-purple-900/20',
    textColor: 'text-purple-800 dark:text-purple-200',
    borderColor: 'border-purple-200 dark:border-purple-400/30',
    markerColor: '#8b5cf6',
  },
  accommodation: {
    value: 'accommodation',
    label: 'Accommodation',
    emoji: '💤',
    bgLight: 'bg-blue-100 dark:bg-blue-900/20',
    textColor: 'text-blue-800 dark:text-blue-200',
    borderColor: 'border-blue-200 dark:border-blue-400/30',
    markerColor: '#3b82f6',
  },
  nature: {
    value: 'nature',
    label: 'Nature',
    emoji: '🌱',
    bgLight: 'bg-green-100 dark:bg-green-900/20',
    textColor: 'text-green-800 dark:text-green-200',
    borderColor: 'border-green-200 dark:border-green-400/30',
    markerColor: '#22c55e',
  },
  airport: {
    value: 'airport',
    label: 'Airport',
    emoji: '✈️',
    bgLight: 'bg-sky-100 dark:bg-sky-900/20',
    textColor: 'text-sky-800 dark:text-sky-200',
    borderColor: 'border-sky-200 dark:border-sky-400/30',
    markerColor: '#0ea5e9',
  },
  food: {
    value: 'food',
    label: 'Food & Dining',
    emoji: '🍽️',
    bgLight: 'bg-orange-100 dark:bg-orange-900/20',
    textColor: 'text-orange-800 dark:text-orange-200',
    borderColor: 'border-orange-200 dark:border-orange-400/30',
    markerColor: '#f97316',
  },
  attraction: {
    value: 'attraction',
    label: 'Attraction',
    emoji: '💸',
    bgLight: 'bg-indigo-100 dark:bg-indigo-900/20',
    textColor: 'text-indigo-800 dark:text-indigo-200',
    borderColor: 'border-indigo-200 dark:border-indigo-400/30',
    markerColor: '#6366f1',
  },
  train_station: {
    value: 'train_station',
    label: 'Train Station',
    emoji: '🚄',
    bgLight: 'bg-gray-100 dark:bg-gray-900/20',
    textColor: 'text-gray-800 dark:text-gray-200',
    borderColor: 'border-gray-200 dark:border-gray-400/30',
    markerColor: '#6b7280',
  },
};

// Helper function to get tag info
export const getAttractionTagInfo = (tag?: AttractionTag): AttractionTagInfo | null => {
  if (!tag) return null;
  return ATTRACTION_TAGS[tag] || null;
};

// Get all available tags as array
export const getAvailableAttractionTags = (): AttractionTagInfo[] => {
  return Object.values(ATTRACTION_TAGS);
};
