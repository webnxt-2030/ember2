import { z } from 'zod';
export declare const projectSlugParamSchema: z.ZodObject<{
    slug: z.ZodString;
}, z.core.$strip>;
export declare const projectListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        LIVE: "LIVE";
        COMPLETED: "COMPLETED";
    }>>>;
}, z.core.$strip>;
export declare const projectPublicResponseSchema: z.ZodObject<{
    id: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    summary: z.ZodString;
    description: z.ZodString;
    pictures: z.ZodArray<z.ZodURL>;
    targetAmount: z.ZodString;
    totalRaised: z.ZodString;
    fundingDeadline: z.ZodNullable<z.ZodISODateTime>;
    rewardCurveType: z.ZodEnum<{
        LINEAR: "LINEAR";
        EXPONENTIAL: "EXPONENTIAL";
        BINARY: "BINARY";
        CUSTOM: "CUSTOM";
    }>;
    escrowAddress: z.ZodNullable<z.ZodString>;
    nftAddress: z.ZodNullable<z.ZodString>;
    status: z.ZodEnum<{
        LIVE: "LIVE";
        COMPLETED: "COMPLETED";
        PAUSED: "PAUSED";
    }>;
    publishedAt: z.ZodNullable<z.ZodISODateTime>;
    organization: z.ZodObject<{
        name: z.ZodString;
    }, z.core.$strip>;
    milestoneCount: z.ZodNumber;
    backerCount: z.ZodNumber;
    milestones: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        title: z.ZodString;
        description: z.ZodString;
        deliverableDate: z.ZodNullable<z.ZodISODateTime>;
        bps: z.ZodNumber;
        status: z.ZodEnum<{
            PENDING: "PENDING";
            AUTO_RELEASED: "AUTO_RELEASED";
            VOTING: "VOTING";
            PASSED: "PASSED";
            FAILED: "FAILED";
            CLAIMED: "CLAIMED";
        }>;
        voteEndAt: z.ZodNullable<z.ZodISODateTime>;
        passed: z.ZodNullable<z.ZodBoolean>;
        claimedAt: z.ZodNullable<z.ZodISODateTime>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const contributionPublicResponseSchema: z.ZodObject<{
    walletAddress: z.ZodString;
    amount: z.ZodString;
    m0Share: z.ZodString;
    contributedAt: z.ZodISODateTime;
    txHash: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=project.d.ts.map