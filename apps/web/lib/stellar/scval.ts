/**
 * Helpers for building Soroban `ScVal` arguments from plain JS values.
 */

import { xdr, Address, nativeToScVal } from "@stellar/stellar-sdk";

export function address(val: string): xdr.ScVal {
  return new Address(val).toScVal();
}

export function i128(val: bigint | number | string): xdr.ScVal {
  return nativeToScVal(val, { type: "i128" });
}

export function u32(val: number): xdr.ScVal {
  return xdr.ScVal.scvU32(val);
}

export function bool(val: boolean): xdr.ScVal {
  return xdr.ScVal.scvBool(val);
}

export function string(val: string): xdr.ScVal {
  return xdr.ScVal.scvString(val);
}

export function vec(vals: xdr.ScVal[]): xdr.ScVal {
  return xdr.ScVal.scvVec(vals);
}

export function parseI128(result?: xdr.ScVal): bigint {
  if (!result) return 0n;
  // nativeToScVal is reversible via ScVal parsing helpers in newer SDKs;
  // this fallback inspects the raw i128 parts.
  const i128 = result.i128();
  const lo = BigInt(i128.lo().toString());
  const hi = BigInt(i128.hi().toString());
  return (hi << 64n) + lo;
}
