import { describe, it, expect } from "vitest";
import { computeMilestoneBps, validateMilestoneBps } from "./reward-curve.js";
import { RewardCurve } from "./types/index.js";
import { MILESTONE_BPS_TOTAL } from "./constants.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------------------
// LINEAR
// ---------------------------------------------------------------------------

describe("computeMilestoneBps – LINEAR", () => {
  it("sums to 10000 for all n in [2..20]", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.LINEAR, n);
      expect(sum(bps), `n=${n}`).toBe(MILESTONE_BPS_TOTAL);
    }
  });

  it("returns array of correct length", () => {
    for (let n = 2; n <= 20; n++) {
      expect(computeMilestoneBps(RewardCurve.LINEAR, n)).toHaveLength(n);
    }
  });

  it("all elements are non-negative integers", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.LINEAR, n);
      bps.forEach((v) => {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("distributes evenly for n=4 (10000 divisible)", () => {
    const bps = computeMilestoneBps(RewardCurve.LINEAR, 4);
    expect(bps).toEqual([2500, 2500, 2500, 2500]);
  });

  it("last element gets rounding residue for n=3", () => {
    const bps = computeMilestoneBps(RewardCurve.LINEAR, 3);
    expect(bps).toEqual([3333, 3333, 3334]);
  });

  it("handles edge case n=2", () => {
    const bps = computeMilestoneBps(RewardCurve.LINEAR, 2);
    expect(bps).toHaveLength(2);
    expect(sum(bps)).toBe(MILESTONE_BPS_TOTAL);
    expect(bps).toEqual([5000, 5000]);
  });

  it("handles edge case n=20", () => {
    const bps = computeMilestoneBps(RewardCurve.LINEAR, 20);
    expect(bps).toHaveLength(20);
    expect(sum(bps)).toBe(MILESTONE_BPS_TOTAL);
    expect(bps).toEqual(Array(20).fill(500));
  });
});

// ---------------------------------------------------------------------------
// EXPONENTIAL
// ---------------------------------------------------------------------------

describe("computeMilestoneBps – EXPONENTIAL", () => {
  it("sums to 10000 for all n in [2..20]", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.EXPONENTIAL, n);
      expect(sum(bps), `n=${n}`).toBe(MILESTONE_BPS_TOTAL);
    }
  });

  it("returns array of correct length", () => {
    for (let n = 2; n <= 20; n++) {
      expect(computeMilestoneBps(RewardCurve.EXPONENTIAL, n)).toHaveLength(n);
    }
  });

  it("all elements are non-negative integers", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.EXPONENTIAL, n);
      bps.forEach((v) => {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("last element is strictly greater than first (geometrically increasing)", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.EXPONENTIAL, n);
      expect(bps[n - 1]!, `n=${n}`).toBeGreaterThan(bps[0]!);
    }
  });

  it("each element is >= previous (non-decreasing) for all n in [2..20]", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.EXPONENTIAL, n);
      for (let i = 1; i < bps.length; i++) {
        expect(bps[i]!, `n=${n} i=${i}`).toBeGreaterThanOrEqual(bps[i - 1]!);
      }
    }
  });

  it("edge case n=2: weights [1,2] → [3333, 6667]", () => {
    const bps = computeMilestoneBps(RewardCurve.EXPONENTIAL, 2);
    expect(bps).toEqual([3333, 6667]);
    expect(sum(bps)).toBe(MILESTONE_BPS_TOTAL);
  });

  it("edge case n=20: sums to 10000", () => {
    const bps = computeMilestoneBps(RewardCurve.EXPONENTIAL, 20);
    expect(sum(bps)).toBe(MILESTONE_BPS_TOTAL);
    expect(bps).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// BINARY
// ---------------------------------------------------------------------------

describe("computeMilestoneBps – BINARY", () => {
  it("sums to 10000 for all n in [2..20]", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.BINARY, n);
      expect(sum(bps), `n=${n}`).toBe(MILESTONE_BPS_TOTAL);
    }
  });

  it("returns array of correct length", () => {
    for (let n = 2; n <= 20; n++) {
      expect(computeMilestoneBps(RewardCurve.BINARY, n)).toHaveLength(n);
    }
  });

  it("all elements are non-negative integers", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.BINARY, n);
      bps.forEach((v) => {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
      });
    }
  });

  it("first element is always 0", () => {
    for (let n = 2; n <= 20; n++) {
      const bps = computeMilestoneBps(RewardCurve.BINARY, n);
      expect(bps[0], `n=${n}`).toBe(0);
    }
  });

  it("special case n=2 → [0, 10000]", () => {
    expect(computeMilestoneBps(RewardCurve.BINARY, 2)).toEqual([0, 10_000]);
  });

  it("n=3: [0, 5000, 5000]", () => {
    const bps = computeMilestoneBps(RewardCurve.BINARY, 3);
    expect(bps).toEqual([0, 5000, 5000]);
  });

  it("last element gets rounding residue when not evenly divisible", () => {
    const bps = computeMilestoneBps(RewardCurve.BINARY, 4);
    expect(bps[0]).toBe(0);
    expect(sum(bps)).toBe(MILESTONE_BPS_TOTAL);
    expect(bps[3]).toBe(3334);
  });

  it("edge case n=20", () => {
    const bps = computeMilestoneBps(RewardCurve.BINARY, 20);
    expect(bps[0]).toBe(0);
    expect(sum(bps)).toBe(MILESTONE_BPS_TOTAL);
    expect(bps).toHaveLength(20);
  });
});

// ---------------------------------------------------------------------------
// CUSTOM
// ---------------------------------------------------------------------------

describe("computeMilestoneBps – CUSTOM", () => {
  it("returns same output as LINEAR for all n in [2..20]", () => {
    for (let n = 2; n <= 20; n++) {
      const custom = computeMilestoneBps(RewardCurve.CUSTOM, n);
      const linear = computeMilestoneBps(RewardCurve.LINEAR, n);
      expect(custom, `n=${n}`).toEqual(linear);
    }
  });

  it("sums to 10000", () => {
    for (let n = 2; n <= 20; n++) {
      expect(sum(computeMilestoneBps(RewardCurve.CUSTOM, n))).toBe(MILESTONE_BPS_TOTAL);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases – throws
// ---------------------------------------------------------------------------

describe("computeMilestoneBps – throws", () => {
  it("throws RangeError for n=1", () => {
    for (const curve of Object.values(RewardCurve)) {
      expect(() => computeMilestoneBps(curve, 1)).toThrow(RangeError);
    }
  });

  it("throws RangeError for n=21", () => {
    for (const curve of Object.values(RewardCurve)) {
      expect(() => computeMilestoneBps(curve, 21)).toThrow(RangeError);
    }
  });

  it("throws RangeError for n=0", () => {
    expect(() => computeMilestoneBps(RewardCurve.LINEAR, 0)).toThrow(RangeError);
  });

  it("throws RangeError for negative n", () => {
    expect(() => computeMilestoneBps(RewardCurve.LINEAR, -5)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// validateMilestoneBps
// ---------------------------------------------------------------------------

describe("validateMilestoneBps", () => {
  it("returns true for a valid array (n=4, sum=10000)", () => {
    expect(validateMilestoneBps([2500, 2500, 2500, 2500])).toBe(true);
  });

  it("returns true for edge case n=2, sum=10000", () => {
    expect(validateMilestoneBps([3000, 7000])).toBe(true);
  });

  it("returns true for edge case n=20, sum=10000", () => {
    const arr = Array(20).fill(500);
    expect(validateMilestoneBps(arr)).toBe(true);
  });

  it("returns false when sum ≠ 10000", () => {
    expect(validateMilestoneBps([5000, 5001])).toBe(false);
  });

  it("returns false when sum = 9999", () => {
    expect(validateMilestoneBps([4999, 5000])).toBe(false);
  });

  it("returns false when array length < 2 (n=1)", () => {
    expect(validateMilestoneBps([10000])).toBe(false);
  });

  it("returns false when array is empty", () => {
    expect(validateMilestoneBps([])).toBe(false);
  });

  it("returns false when array length > 20", () => {
    const arr = Array(21).fill(0);
    arr[20] = 10000;
    expect(validateMilestoneBps(arr)).toBe(false);
  });

  it("returns false when any element is negative", () => {
    expect(validateMilestoneBps([-1, 10001])).toBe(false);
  });

  it("returns false when any element is not an integer", () => {
    expect(validateMilestoneBps([5000.5, 4999.5])).toBe(false);
  });

  it("validates all computeMilestoneBps outputs", () => {
    for (const curve of Object.values(RewardCurve)) {
      for (let n = 2; n <= 20; n++) {
        const bps = computeMilestoneBps(curve, n);
        expect(validateMilestoneBps(bps), `curve=${curve} n=${n}`).toBe(true);
      }
    }
  });
});
