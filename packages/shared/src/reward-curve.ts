import { RewardCurve } from "./types/index.js";
import { MILESTONE_BPS_TOTAL, MIN_MILESTONES, MAX_MILESTONES } from "./constants.js";

/**
 * Compute milestone basis-point allocations for a given reward curve.
 *
 * Rules:
 *  - Returns an integer array of length `n`, each element ≥ 0.
 *  - The array always sums to exactly MILESTONE_BPS_TOTAL (10 000).
 *  - Any rounding residue is added to the LAST element.
 *  - Throws a RangeError when n < MIN_MILESTONES or n > MAX_MILESTONES.
 */
export function computeMilestoneBps(curve: RewardCurve, n: number): number[] {
  if (n < MIN_MILESTONES || n > MAX_MILESTONES) {
    throw new RangeError(
      `n must be between ${String(MIN_MILESTONES)} and ${String(MAX_MILESTONES)}, got ${String(n)}`,
    );
  }

  switch (curve) {
    // LINEAR & CUSTOM use equal distribution; CUSTOM users override individual bps values via UI
    case RewardCurve.LINEAR:
    case RewardCurve.CUSTOM:
      return computeLinear(n);

    case RewardCurve.EXPONENTIAL:
      return computeExponential(n);

    case RewardCurve.BINARY:
      return computeBinary(n);

    default: {
      // TypeScript exhaustiveness guard
      const _exhaustive: never = curve;
      throw new Error(`Unknown reward curve: ${String(_exhaustive)}`);
    }
  }
}

/** Evenly distributed. Each slot = floor(10000/n); last takes residue. */
function computeLinear(n: number): number[] {
  const base = Math.floor(MILESTONE_BPS_TOTAL / n);
  const bps = Array<number>(n).fill(base);
  bps[n - 1] = MILESTONE_BPS_TOTAL - base * (n - 1);
  return bps;
}

/**
 * Geometrically increasing weights (ratio r=2).
 * weight_i = 2^i  (i = 0 … n-1)
 * bps_i = floor(weight_i * 10000 / totalWeight), last takes residue.
 */
function computeExponential(n: number): number[] {
  const weights = Array.from({ length: n }, (_, i) => Math.pow(2, i));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const bps = weights.map((w) => Math.floor((w * MILESTONE_BPS_TOTAL) / totalWeight));
  const assigned = bps.slice(0, n - 1).reduce((a, b) => a + b, 0);
  bps[n - 1] = MILESTONE_BPS_TOTAL - assigned;
  return bps;
}

/**
 * First milestone = 0 bps; remaining (n-1) milestones split 10000 evenly.
 * first=0, each of rest = floor(10000/(n-1)), last takes residue.
 */
function computeBinary(n: number): number[] {
  const bps = Array<number>(n).fill(0);
  const rest = n - 1;
  const base = Math.floor(MILESTONE_BPS_TOTAL / rest);
  for (let i = 1; i < n - 1; i++) {
    bps[i] = base;
  }
  // last element takes the residue
  bps[n - 1] = MILESTONE_BPS_TOTAL - base * (rest - 1);
  return bps;
}

/**
 * Returns true iff:
 *  - bps.length is in [MIN_MILESTONES, MAX_MILESTONES]
 *  - every element is a non-negative integer
 *  - the array sums to exactly MILESTONE_BPS_TOTAL (10 000)
 */
export function validateMilestoneBps(bps: number[]): boolean {
  if (bps.length < MIN_MILESTONES || bps.length > MAX_MILESTONES) return false;
  if (bps.some((v) => !Number.isInteger(v) || v < 0)) return false;
  return bps.reduce((a, b) => a + b, 0) === MILESTONE_BPS_TOTAL;
}
