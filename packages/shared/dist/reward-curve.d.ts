import { RewardCurve } from "./types/index.js";
/**
 * Compute milestone basis-point allocations for a given reward curve.
 *
 * Rules:
 *  - Returns an integer array of length `n`, each element ≥ 0.
 *  - The array always sums to exactly MILESTONE_BPS_TOTAL (10 000).
 *  - Any rounding residue is added to the LAST element.
 *  - Throws a RangeError when n < MIN_MILESTONES or n > MAX_MILESTONES.
 */
export declare function computeMilestoneBps(curve: RewardCurve, n: number): number[];
/**
 * Returns true iff:
 *  - bps.length is in [MIN_MILESTONES, MAX_MILESTONES]
 *  - every element is a non-negative integer
 *  - the array sums to exactly MILESTONE_BPS_TOTAL (10 000)
 */
export declare function validateMilestoneBps(bps: number[]): boolean;
//# sourceMappingURL=reward-curve.d.ts.map