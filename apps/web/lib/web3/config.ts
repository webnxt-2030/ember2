import { defineChain, http } from "viem";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit";
import type { Config } from "wagmi";
import {
  MORPH_CHAIN_ID,
  MORPH_RPC_URL,
  MORPH_EXPLORER_URL,
} from "@ember/shared";

const BITGET_WALLETCONNECT_ID =
  "38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662";

export const morphChain = defineChain({
  id: MORPH_CHAIN_ID,
  name: "Morph",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [MORPH_RPC_URL] },
  },
  blockExplorers: {
    default: { name: "Morph Explorer", url: MORPH_EXPLORER_URL },
  },
});

const projectId =
  process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "build-placeholder-set-in-railway";
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Ember";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ember.example";

const wagmiAdapter = new WagmiAdapter({
  networks: [morphChain],
  projectId,
  chains: [morphChain],
  transports: {
    [morphChain.id]: http(),
  },
});

export const appKit = createAppKit({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  adapters: [wagmiAdapter as any],
  networks: [morphChain],
  projectId,
  metadata: {
    name: appName,
    description: "Trust-minimized milestone-based crowdfunding on Morph L2",
    url: appUrl,
    icons: [],
  },
  featuredWalletIds: [BITGET_WALLETCONNECT_ID],
  allWallets: "SHOW",
});

export const appKitWagmiConfig: Config = wagmiAdapter.wagmiConfig;
