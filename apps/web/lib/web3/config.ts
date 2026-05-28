import { defineChain, http } from "viem";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { createAppKit } from "@reown/appkit/react";
import type { Config } from "wagmi";

const BITGET_WALLETCONNECT_ID =
  "38f5d18bd8522c244bdd70cb4a68e0e718865155811c043f052fb9f1c51de662";

const chainId = Number(process.env.NEXT_PUBLIC_MORPH_CHAIN_ID ?? 2910);
const rpcUrl = process.env.NEXT_PUBLIC_MORPH_RPC_URL ?? "https://rpc-hoodi.morph.network";
const explorerUrl = process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL ?? "https://explorer-hoodi.morph.network";

export const morphChain = defineChain({
  id: chainId,
  name: "Morph",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: [rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Morph Explorer", url: explorerUrl },
  },
});

// Falls back to a placeholder so the app can build/prerender without the env var set;
// wallet connectivity requires a real project id at runtime.
const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID ?? "placeholder";
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Ember";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.ember.example";

const wagmiAdapter = new WagmiAdapter({
  networks: [morphChain],
  projectId,
  chains: [morphChain],
  transports: {
    [morphChain.id]: http(MORPH_RPC_URL),
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
