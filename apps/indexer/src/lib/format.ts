import { USDC_DECIMALS } from "@ember/shared/soroban";

export function formatUsdc(value: bigint): string {
  const divisor = 10n ** BigInt(USDC_DECIMALS);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(USDC_DECIMALS, "0");
  const trimmed = fractionStr.replace(/0+$/, "");
  return trimmed ? `${String(whole)}.${trimmed}` : whole.toString();
}
