import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { indexerEnv } from "./env.js";

const morphMainnet = {
  id: 2818,
  name: "Morph L2",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [indexerEnv.MORPH_RPC_URL] as const },
  },
} as const;

export const publicClient = createPublicClient({
  chain: morphMainnet,
  transport: http(indexerEnv.MORPH_RPC_URL),
});

export const keeperWallet = createWalletClient({
  account: privateKeyToAccount(indexerEnv.KEEPER_PRIVATE_KEY as `0x${string}`),
  chain: morphMainnet,
  transport: http(indexerEnv.NEXT_PUBLIC_MORPH_RPC_URL),
});

export { indexerEnv } from "./env.js";