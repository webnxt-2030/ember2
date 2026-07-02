declare module "@ember/shared" {
  import type { Logger } from "pino";
  export const logger: Logger;
  export * from "./constants.js";
  export * from "./types/index.js";
  export * from "./abis/index.js";
  export * from "./soroban/index.js";
  export * from "./schemas/index.js";
  export * from "./reward-curve.js";
}

declare module "@ember/shared/logger" {
  import type { Logger } from "pino";
  export const logger: Logger;
}

declare module "@ember/shared/constants" {
  export const STELLAR_NETWORK: "TESTNET";
  export const STELLAR_NETWORK_PASSPHRASE: string;
  export const STELLAR_RPC_URL: string;
  export const STELLAR_HORIZON_URL: string;
  export const STELLAR_EXPLORER_URL: string;
  export const USDC_CONTRACT_ID: string;
  export const USDC_DECIMALS: 7;
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

declare module "@ember/shared/soroban" {
  export const STELLAR_NETWORK: string;
  export const STELLAR_NETWORK_PASSPHRASE: string;
  export const STELLAR_RPC_URL: string;
  export const STELLAR_HORIZON_URL: string;
  export const STELLAR_EXPLORER_URL: string;
  export const USDC_CONTRACT_ID: string;
  export const USDC_DECIMALS: number;
  export const FACTORY_CONTRACT_ID: string;
  export const projectFactoryMethods: readonly string[];
  export const projectEscrowMethods: readonly string[];
  export const positionNftMethods: readonly string[];
  export const STELLAR_NETWORK_LABEL: string;
}

declare module "@ember/shared/contract-errors" {
  export function formatContractError(
    err: Error | null | undefined,
    fallback?: string
  ): string | null;
}
