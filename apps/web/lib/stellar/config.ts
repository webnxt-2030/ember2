/**
 * Stellar wallet and network configuration for Ember.
 *
 * Replaces the previous viem/wagmi/@reown/appkit EVM stack with
 * `stellar-wallet-kit` plus `@stellar/stellar-sdk`.
 */

import {
  STELLAR_NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
  STELLAR_HORIZON_URL,
  STELLAR_EXPLORER_URL,
  FACTORY_CONTRACT_ID,
} from "@ember/shared/soroban";
import { env } from "@/env";

export const stellarNetwork = env.NEXT_PUBLIC_STELLAR_NETWORK;

export const networkPassphrase =
  env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || STELLAR_NETWORK_PASSPHRASE;

export const rpcUrl = env.NEXT_PUBLIC_STELLAR_RPC_URL || STELLAR_RPC_URL;

export const horizonUrl =
  env.NEXT_PUBLIC_STELLAR_HORIZON_URL || STELLAR_HORIZON_URL;

export const explorerUrl =
  env.NEXT_PUBLIC_STELLAR_EXPLORER_URL || STELLAR_EXPLORER_URL;

export const usdcContractId = env.NEXT_PUBLIC_USDC_CONTRACT_ID;

export const factoryContractId =
  env.NEXT_PUBLIC_FACTORY_CONTRACT_ID ?? FACTORY_CONTRACT_ID;

export const getExplorerTxUrl = (txHash: string) =>
  `${explorerUrl}/tx/${txHash}`;

export const getExplorerContractUrl = (contractId: string) =>
  `${explorerUrl}/contract/${contractId}`;

export const getExplorerAccountUrl = (address: string) =>
  `${explorerUrl}/account/${address}`;
