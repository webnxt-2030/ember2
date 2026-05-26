import { z } from 'zod'

export const addressSchema = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/, 'Invalid Ethereum address')

export const usdtAmountSchema = z
  .string()
  .regex(/^\d+(\.\d{1,6})?$/, 'Invalid USDT amount (max 6 decimal places)')

export const milestoneBpsSchema = z
  .array(z.number().int().nonnegative())
  .min(2)
  .max(20)
  .refine((bps) => bps.reduce((a, b) => a + b, 0) === 10000, {
    message: 'Milestone basis points must sum to 10000',
  })

export const votingPeriodSchema = z
  .number()
  .int()
  .min(3 * 24 * 60 * 60, 'Voting period must be at least 3 days')
  .max(30 * 24 * 60 * 60, 'Voting period must be at most 30 days')

export const cuidSchema = z.cuid2()

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const slugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens')
