import { z } from 'zod';
export declare const addressSchema: z.ZodString;
export declare const usdcAmountSchema: z.ZodString;
export declare const usdtAmountSchema: z.ZodString;
export declare const milestoneBpsSchema: z.ZodArray<z.ZodNumber>;
export declare const votingPeriodSchema: z.ZodNumber;
export declare const cuidSchema: z.ZodString;
export declare const paginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    pageSize: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
}, z.core.$strip>;
export declare const slugSchema: z.ZodString;
//# sourceMappingURL=index.d.ts.map