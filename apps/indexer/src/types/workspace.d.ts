declare module "@ember/shared" {
  import type { Logger } from "pino";
  export const logger: Logger;
  export * from "./constants.js";
  export * from "./types/index.js";
  export * from "./abis/index.js";
  export * from "./schemas/index.js";
  export * from "./reward-curve.js";
}

declare module "@ember/shared/logger" {
  import type { Logger } from "pino";
  export const logger: Logger;
}

declare module "@ember/shared/constants" {
  export const MORPH_CHAIN_ID: 2910;
  export const MORPH_TESTNET_CHAIN_ID: 2910;
  export const USDT_ADDRESS: `0x${string}`;
  export const USDT_DECIMALS: 6;
  export const MORPH_RPC_URL: string;
  export const MORPH_EXPLORER_URL: string;
  export const DEFAULT_VOTING_PERIOD_SECONDS: number;
  export const MIN_VOTING_PERIOD_SECONDS: number;
  export const MAX_VOTING_PERIOD_SECONDS: number;
  export const MILESTONE_BPS_TOTAL: number;
  export const MIN_MILESTONES: number;
  export const MAX_MILESTONES: number;
}

declare module "@ember/shared/abis" {
  export const ProjectFactoryAbi: readonly unknown[];
  export const ProjectEscrowAbi: readonly unknown[];
  export const PositionNFTAbi: readonly unknown[];
}

declare module "@ember/shared/contract-errors" {
  export function formatContractError(
    err: Error | null | undefined,
    fallback?: string
  ): string | null;
}