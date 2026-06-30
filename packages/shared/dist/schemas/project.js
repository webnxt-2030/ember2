import { z } from 'zod';
import { slugSchema, paginationSchema, cuidSchema } from './index.js';
export const projectSlugParamSchema = z.object({ slug: slugSchema });
export const projectListQuerySchema = paginationSchema.extend({
    status: z.enum(['LIVE', 'COMPLETED']).optional().default('LIVE'),
});
export const projectPublicResponseSchema = z.object({
    id: cuidSchema,
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    description: z.string(),
    pictures: z.array(z.url()),
    targetAmount: z.string(),
    totalRaised: z.string(),
    fundingDeadline: z.iso.datetime().nullable(),
    rewardCurveType: z.enum(['LINEAR', 'EXPONENTIAL', 'BINARY', 'CUSTOM']),
    escrowAddress: z.string().nullable(),
    nftAddress: z.string().nullable(),
    status: z.enum(['LIVE', 'COMPLETED', 'PAUSED']),
    publishedAt: z.iso.datetime().nullable(),
    organization: z.object({ name: z.string() }),
    milestoneCount: z.number().int(),
    backerCount: z.number().int(),
    milestones: z.array(z.object({
        index: z.number().int(),
        title: z.string(),
        description: z.string(),
        deliverableDate: z.iso.datetime().nullable(),
        bps: z.number().int(),
        status: z.enum(['PENDING', 'AUTO_RELEASED', 'VOTING', 'PASSED', 'FAILED', 'CLAIMED']),
        voteEndAt: z.iso.datetime().nullable(),
        passed: z.boolean().nullable(),
        claimedAt: z.iso.datetime().nullable(),
    })),
});
export const contributionPublicResponseSchema = z.object({
    walletAddress: z.string(),
    amount: z.string(),
    m0Share: z.string(),
    contributedAt: z.iso.datetime(),
    txHash: z.string(),
});
//# sourceMappingURL=project.js.map