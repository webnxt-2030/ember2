export const STELLAR_NETWORK = "TESTNET" as const;
export const STELLAR_NETWORK_PASSPHRASE =
  "Test SDF Network ; September 2015" as const;

export const STELLAR_RPC_URL = "https://soroban-testnet.stellar.org";
export const STELLAR_HORIZON_URL = "https://horizon-testnet.stellar.org";
export const STELLAR_EXPLORER_URL = "https://stellar.expert/explorer/testnet";

export const USDC_CONTRACT_ID = "" as const;
export const USDC_DECIMALS = 7;

export const DEFAULT_VOTING_PERIOD_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const MIN_VOTING_PERIOD_SECONDS = 60 * 60 * 24 * 3; // 3 days
export const MAX_VOTING_PERIOD_SECONDS = 60 * 60 * 24 * 30; // 30 days

export const MILESTONE_BPS_TOTAL = 10_000;
export const MIN_MILESTONES = 2;
export const MAX_MILESTONES = 20;
