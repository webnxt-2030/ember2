import { z } from 'zod'

// Ethereum address (42 chars, 0x prefix, hex)
export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address')

// USDT amount as string (≤6 decimal places)
export const usdtAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, 'Invalid USDT amount (max 6 decimal places)')

// Milestone basis points array: 2-20 items, each ≥0, sum = 10000
export const milestoneBpsSchema = z
  .array(z.number().int().nonnegative())
  .min(2)
  .max(20)
  .refine((bps) => bps.reduce((a, b) => a + b, 0) === 10000, {
    message: 'Milestone basis points must sum to 10000',
  })

// Voting period: 3..30 days in seconds
export const votingPeriodSchema = z
  .number()
  .int()
  .min(3 * 24 * 60 * 60, 'Voting period must be at least 3 days')
  .max(30 * 24 * 60 * 60, 'Voting period must be at most 30 days')

// CUID
export const cuidSchema = z.string().cuid()

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

// Slug: lowercase letters, numbers, hyphens
export const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens')
