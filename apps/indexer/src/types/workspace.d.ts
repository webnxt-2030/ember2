declare module "@ember/shared" {
  import type { Logger } from "pino";
  export const logger: Logger;
  export * from "./constants.js";
  export * from "./types/index.js";
  export * from "./abis/index.js";
  export * from "./schemas/index.js";
  export * from "./reward-curve.js";
}

declare module "@ember/shared/logger.js" {
  import type { Logger } from "pino";
  export const logger: Logger;
}

declare module "@ember/shared/constants.js" {
  export const MORPH_CHAIN_ID: 2818;
  export const MORPH_TESTNET_CHAIN_ID: 2810;
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

declare module "@ember/shared/abis.js" {
  export const ProjectFactoryAbi: readonly unknown[];
  export const ProjectEscrowAbi: readonly unknown[];
  export const PositionNFTAbi: readonly unknown[];
}

declare module "../../web/lib/db.js" {
  import type { PrismaClient } from "@prisma/client";
  export const prisma: PrismaClient;
}