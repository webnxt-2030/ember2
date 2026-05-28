import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { indexerEnv } from "./env.js";

const morphChain = {
  id: indexerEnv.MORPH_CHAIN_ID,
  name: "Morph Hoodi",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [indexerEnv.MORPH_RPC_URL] as const },
  },
} as const;

export const publicClient = createPublicClient({
  chain: morphChain,
  transport: http(indexerEnv.MORPH_RPC_URL),
});

export const keeperWallet = createWalletClient({
  account: privateKeyToAccount(indexerEnv.KEEPER_PRIVATE_KEY as `0x${string}`),
  chain: morphChain,
  transport: http(indexerEnv.MORPH_RPC_URL),
});

export { indexerEnv } from "./env.js";