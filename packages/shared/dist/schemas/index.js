import { z } from 'zod';
// Stellar address: 56-character StrKey (public key G... or contract C...)
export const addressSchema = z
    .string()
    .regex(/^[GC][A-Z2-7]{55}$/, 'Invalid Stellar address');
// Stellar USDC amount as string (≤7 decimal places)
export const usdcAmountSchema = z
    .string()
    .regex(/^\d+(\.\d{1,7})?$/, 'Invalid USDC amount (max 7 decimal places)');
// @deprecated kept for transitional imports; prefer usdcAmountSchema
export const usdtAmountSchema = usdcAmountSchema;
// Milestone basis points array: 2-20 items, each ≥0, sum = 10000
export const milestoneBpsSchema = z
    .array(z.number().int().nonnegative())
    .min(2)
    .max(20)
    .refine((bps) => bps.reduce((a, b) => a + b, 0) === 10000, {
    message: 'Milestone basis points must sum to 10000',
});
// Voting period: 3..30 days in seconds
export const votingPeriodSchema = z
    .number()
    .int()
    .min(3 * 24 * 60 * 60, 'Voting period must be at least 3 days')
    .max(30 * 24 * 60 * 60, 'Voting period must be at most 30 days');
// CUID — Prisma generates CUID v1 IDs (schema uses @default(cuid())), so we validate
// that format directly. z.cuid2() is the non-deprecated API but rejects v1 IDs, which
// would break every existing record; this regex mirrors zod's original .cuid() check.
export const cuidSchema = z.string().regex(/^[cC][^\s-]{8,}$/, 'Invalid CUID');
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const slugSchema = z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase letters, numbers, and hyphens');
//# sourceMappingURL=index.js.map