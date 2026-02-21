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
 * Schema dla tworzenia nowej podróży
 */
export const createJourneySchema = z.object({
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(255, 'Title must not exceed 255 characters'),
    description: z.string().max(2000, 'Description must not exceed 2000 characters').optional(),
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    totalEstimatedCost: z.number().nonnegative('Total cost must be non-negative').optional(),
    currency: z.string()
      .length(3, 'Currency must be a 3-letter code (e.g., PLN, EUR, USD)')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase 3-letter code')
      .default('PLN'),
  }).passthrough().refine(
    (data) => {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return end >= start;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  ),
});

/**
 * Schema dla aktualizacji podróży
 */
export const updateJourneySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Journey ID must be a number'),
  }),
  body: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(255, 'Title must not exceed 255 characters')
      .optional(),
    description: z.string().max(2000, 'Description must not exceed 2000 characters').optional(),
    startDate: dateStringSchema.optional(),
    endDate: dateStringSchema.optional(),
    totalEstimatedCost: z.number().nonnegative('Total cost must be non-negative').optional(),
    currency: z.string()
      .length(3, 'Currency must be a 3-letter code')
      .regex(/^[A-Z]{3}$/, 'Currency must be uppercase')
      .optional(),
  }).passthrough().refine(
    (data) => {
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        return end >= start;
      }
      return true;
    },
    {
      message: 'End date must be after or equal to start date',
      path: ['endDate'],
    }
  ),
});

/**
 * Schema dla pobierania listy podróży (pagination) - tylko query
 */
export const getJourneysSchema = z.object({
  page: z.string().regex(/^\d+$/, 'Page must be a number').optional().default('1'),
  limit: z.string().regex(/^\d+$/, 'Limit must be a number').optional().default('25'),
  pageSize: z.string().regex(/^\d+$/, 'PageSize must be a number').optional(),
});

/**
 * Schema dla pobierania pojedynczej podróży
 */
export const getJourneyByIdSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Journey ID must be a number'),
  }),
});

/**
 * Schema dla usuwania podróży
 */
export const deleteJourneySchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, 'Journey ID must be a number'),
  }),
});
