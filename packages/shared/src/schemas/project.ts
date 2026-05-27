import { z } from 'zod'
import { slugSchema, paginationSchema } from './common.js'

export const projectSlugParamSchema = z.object({ slug: slugSchema })

export const projectListQuerySchema = paginationSchema.extend({
  status: z.enum(['LIVE', 'COMPLETED']).optional().default('LIVE'),
})

export const projectPublicResponseSchema = z.object({
  id: z.string().cuid(),
  slug: z.string(),
  title: z.string(),
  summary: z.string(),
  description: z.string(),
  pictures: z.array(z.string().url()),
  targetAmount: z.string(),
  totalRaised: z.string(),
  fundingDeadline: z.string().datetime().nullable(),
  rewardCurveType: z.enum(['LINEAR', 'EXPONENTIAL', 'BINARY', 'CUSTOM']),
  escrowAddress: z.string().nullable(),
  nftAddress: z.string().nullable(),
  status: z.enum(['LIVE', 'COMPLETED', 'PAUSED']),
  publishedAt: z.string().datetime().nullable(),
  organization: z.object({ name: z.string() }),
  milestoneCount: z.number().int(),
  backerCount: z.number().int(),
  milestones: z.array(z.object({
    index: z.number().int(),
    title: z.string(),
    description: z.string(),
    deliverableDate: z.string().datetime().nullable(),
    bps: z.number().int(),
    status: z.enum(['PENDING', 'AUTO_RELEASED', 'VOTING', 'PASSED', 'FAILED', 'CLAIMED']),
    voteEndAt: z.string().datetime().nullable(),
    passed: z.boolean().nullable(),
    claimedAt: z.string().datetime().nullable(),
  })),
})

export const contributionPublicResponseSchema = z.object({
  walletAddress: z.string(),
  amount: z.string(),
  m0Share: z.string(),
  contributedAt: z.string().datetime(),
  txHash: z.string(),
})
