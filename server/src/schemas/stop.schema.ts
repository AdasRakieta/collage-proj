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
 * Schema dla tworzenia nowego przystanku (stop/city)
 * journeyId comes from route params, not body
 */
export const createStopSchema = z.object({
  params: z.object({
    journeyId: z.string().regex(/^\d+$/, 'Journey ID must be a number'),
  }),
  body: z.object({
    city: z.string()
      .min(1, 'City name is required')
      .max(255, 'City name must not exceed 255 characters'),
    country: z.string()
      .min(1, 'Country is required')
      .max(255, 'Country must not exceed 255 characters'),
    latitude: z.number()
      .min(-90, 'Latitude must be between -90 and 90')
      .max(90, 'Latitude must be between -90 and 90'),
    longitude: z.number()
      .min(-180, 'Longitude must be between -180 and 180')
      .max(180, 'Longitude must be between -180 and 180'),
    arrivalDate: dateStringSchema,
    departureDate: dateStringSchema,
    accommodationName: z.string().max(255, 'Accommodation name must not exceed 255 characters').optional(),
    accommodationUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
    accommodationPrice: z.number().nonnegative('Accommodation price must be non-negative').optional(),
    accommodationCurrency: z.string()
      .length(3, 'Currency must be a 3-letter code')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
      .optional(),
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    // Address fields
    addressStreet: z.string().max(255).optional().nullable(),
    addressHouseNumber: z.string().max(64).optional().nullable(),
    postalCode: z.string().max(32).optional().nullable(),
    // Time fields
    checkInTime: z.string().max(5).optional().nullable(),
    checkOutTime: z.string().max(5).optional().nullable(),
  }).passthrough().refine(
    (data) => {
      const arrival = new Date(data.arrivalDate);
      const departure = new Date(data.departureDate);
      return departure >= arrival;
    },
    {
      message: 'Departure date must be after or equal to arrival date',
      path: ['departureDate'],
    }
  ),
});

/**
 * Schema dla aktualizacji przystanku
 */
export const updateStopSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Stop ID must be a number'),
  }),
  body: z.object({
    city: z.string().min(1).max(255).optional(),
    country: z.string().min(1).max(255).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    arrivalDate: dateStringSchema.optional(),
    departureDate: dateStringSchema.optional(),
    accommodationName: z.string().max(255).nullable().optional(),
    accommodationUrl: z.string().url().nullable().optional().or(z.literal('')),
    accommodationPrice: z.number().nonnegative().nullable().optional(),
    accommodationCurrency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
    notes: z.string().max(2000).nullable().optional(),
    // Address fields
    addressStreet: z.string().max(255).nullable().optional(),
    addressHouseNumber: z.string().max(64).nullable().optional(),
    postalCode: z.string().max(32).nullable().optional(),
    // Time fields
    checkInTime: z.string().max(5).nullable().optional(),
    checkOutTime: z.string().max(5).optional().nullable(),
    // Payment status
    isPaid: z.boolean().optional(),
    // Order index for sorting
    orderIndex: z.number().optional(),
  }).passthrough(), // Allow additional fields for backwards compatibility
});
