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
 * Dozwolone typy transportu
 */
const transportTypes = ['flight', 'train', 'bus', 'car', 'other'] as const;

/**
 * Schema dla tworzenia nowego transportu
 * journeyId comes from route params, not body
 */
export const createTransportSchema = z.object({
  params: z.object({
    journeyId: z.string().regex(/^\d+$/, 'Journey ID must be a number'),
  }),
  body: z.object({
    type: z.enum(transportTypes, {
      message: `Type must be one of: ${transportTypes.join(', ')}`,
    }),
    fromLocation: z.string()
      .min(1, 'From location is required')
      .max(255, 'From location must not exceed 255 characters'),
    toLocation: z.string()
      .min(1, 'To location is required')
      .max(255, 'To location must not exceed 255 characters'),
    departureDate: dateStringSchema,
    arrivalDate: dateStringSchema,
    price: z.number().nonnegative('Price must be non-negative'),
    currency: z.string()
      .length(3, 'Currency must be a 3-letter code')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
      .default('PLN'),
    bookingUrl: z.string().url('Invalid URL format').optional().or(z.literal('')),
    notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
    flightNumber: z.string().max(50, 'Flight number must not exceed 50 characters').optional(),
    trainNumber: z.string().max(50, 'Train number must not exceed 50 characters').optional(),
    isPaid: z.boolean().optional(),
  }).passthrough().refine(
    (data) => {
      const departure = new Date(data.departureDate);
      const arrival = new Date(data.arrivalDate);
      return arrival >= departure;
    },
    {
      message: 'Arrival date must be after or equal to departure date',
      path: ['arrivalDate'],
    }
  ),
});

/**
 * Schema dla aktualizacji transportu
 */
export const updateTransportSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Transport ID must be a number'),
  }),
  body: z.object({
    type: z.enum(transportTypes).optional(),
    fromLocation: z.string().min(1).max(255).optional(),
    toLocation: z.string().min(1).max(255).optional(),
    departureDate: dateStringSchema.optional(),
    arrivalDate: dateStringSchema.optional(),
    price: z.number().nonnegative().optional(),
    currency: z.string().length(3).regex(/^[A-Z]{3}$/).optional(),
    bookingUrl: z.string().url().optional().or(z.literal('')),
    notes: z.string().max(2000).optional(),
    flightNumber: z.string().max(50).optional(),
    trainNumber: z.string().max(50).optional(),
    isPaid: z.boolean().optional(),
  }).passthrough(), // Allow additional fields for backwards compatibility
});
