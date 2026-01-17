import { z } from 'zod';

// Custom date validator that accepts both YYYY-MM-DD and ISO datetime strings
const dateStringSchema = z.string()
  .refine((val) => {
    // Accept YYYY-MM-DD format (from HTML date input)
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return true;
    // Accept ISO datetime format
    if (/^\d{4}-\d{2}-\d{2}T/.test(val)) return true;
    return false;
  }, 'Invalid date format. Expected YYYY-MM-DD or ISO datetime')
  .transform((val) => {
    // If it's just a date (YYYY-MM-DD), convert to datetime at midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      return `${val}T00:00:00.000Z`;
    }
    return val;
  });

/**
 * Dozwolone priorytety dla atrakcji
 */
const priorityTypes = ['must', 'should', 'could', 'skip'] as const;

/**
 * Schema dla tworzenia nowej atrakcji
 * stopId comes from route params, not body
 */
export const createAttractionSchema = z.object({
  params: z.object({
    stopId: z.string().regex(/^\d+$/, 'Stop ID must be a number'),
  }),
  body: z.object({
    name: z.string()
      .min(1, 'Name is required')
      .max(255, 'Name must not exceed 255 characters'),
    description: z.string().max(2000, 'Description must not exceed 2000 characters').optional().nullable(),
    estimatedCost: z.number().nonnegative('Estimated cost must be non-negative').optional().nullable(),
    currency: z.string()
      .length(3, 'Currency must be a 3-letter code')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
      .optional(),
    duration: z.string().max(50, 'Duration must not exceed 50 characters').optional().nullable(),
    isPaid: z.boolean().optional(),
    // Address fields
    address: z.string().max(500).optional().nullable(),
    addressStreet: z.string().max(255).optional().nullable(),
    addressCity: z.string().max(255).optional().nullable(),
    addressPostalCode: z.string().max(32).optional().nullable(),
    addressCountry: z.string().max(255).optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    // Planning fields
    visitTime: z.string().max(5).optional().nullable(), // HH:MM format
    openingTime: z.string().max(5).optional().nullable(), // HH:MM format
    closingTime: z.string().max(5).optional().nullable(), // HH:MM format
    orderIndex: z.number().optional(),
    priority: z.enum(priorityTypes).optional(),
    plannedDate: z.union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Planned date must be YYYY-MM-DD'),
      z.string().regex(/^\d{4}-\d{2}-\d{2}T/, 'Planned date must be ISO datetime')
    ]).optional().nullable(),
    plannedTime: z.string().max(5).optional().nullable(), // HH:MM format
    tag: z.enum(['beauty', 'cafe', 'must_see', 'accommodation', 'nature', 'airport', 'food', 'attraction', 'train_station']).optional().nullable(),
  }).passthrough(),
});

/**
 * Schema dla aktualizacji atrakcji
 */
export const updateAttractionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Attraction ID must be a number'),
  }),
  body: z.object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().max(2000).optional().nullable(),
    estimatedCost: z.number().nonnegative().optional().nullable(),
    currency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
    duration: z.string().max(50).optional().nullable(),
    isPaid: z.boolean().optional(),
    // Address fields
    address: z.string().max(500).optional().nullable(),
    addressStreet: z.string().max(255).optional().nullable(),
    addressCity: z.string().max(255).optional().nullable(),
    addressPostalCode: z.string().max(32).optional().nullable(),
    addressCountry: z.string().max(255).optional().nullable(),
    latitude: z.number().min(-90).max(90).optional().nullable(),
    longitude: z.number().min(-180).max(180).optional().nullable(),
    // Planning fields
    visitTime: z.string().max(5).optional().nullable(),
    openingTime: z.string().max(5).optional().nullable(), // HH:MM format
    closingTime: z.string().max(5).optional().nullable(), // HH:MM format
    orderIndex: z.number().optional(),
    priority: z.enum(priorityTypes).optional().nullable(),
    plannedDate: z.union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Planned date must be YYYY-MM-DD'),
      z.string().regex(/^\d{4}-\d{2}-\d{2}T/, 'Planned date must be ISO datetime')
    ]).optional().nullable(),
    plannedTime: z.string().max(5).optional().nullable(),
    tag: z.enum(['beauty', 'cafe', 'must_see', 'accommodation', 'nature', 'airport', 'food', 'attraction', 'train_station']).optional().nullable(),
  }).passthrough(), // Allow additional fields for backwards compatibility
});

/**
 * Schema dla pobierania atrakcji po stop ID
 */
export const getAttractionsByStopIdSchema = z.object({
  params: z.object({
    stopId: z.string().regex(/^\d+$/, 'Stop ID must be a number'),
  }),
});

/**
 * Schema dla usuwania atrakcji
 */
export const deleteAttractionSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Attraction ID must be a number'),
  }),
});
