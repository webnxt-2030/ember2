"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { NetworkType, WalletProvider, useWallet } from "stellar-wallet-kit";
import { stellarNetwork } from "@/lib/stellar/config";

export interface StellarWallet {
  address: string;
  signTransaction: (xdr: string) => Promise<string>;
  signMessage?: (message: string) => Promise<string>;
};

interface StellarContextValue {
  wallet: StellarWallet | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
};

const StellarContext = createContext<StellarContextValue | undefined>(
  undefined,
);

function StellarProviderInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const { account, isConnected, isConnecting, connect, disconnect, signTransaction } = useWallet();

  const wallet = useMemo<StellarWallet | null>(() => {
    if (!account) return null;
    return {
      address: account.address,
      signTransaction: async (xdr: string) => {
        const { signedTxXdr } = await signTransaction(xdr);
        return signedTxXdr;
      },
      signMessage: (_message: string) => {
        throw new Error("signMessage not supported by stellar-wallet-kit");
      },
    };
  }, [account, signTransaction]);

  const handleConnect = useCallback(async () => {
    await connect();
  }, [connect]);

  const handleDisconnect = useCallback(async () => {
    await disconnect();
  }, [disconnect]);

  return (
    <StellarContext.Provider
      value={{
        wallet,
        isConnected,
        isConnecting,
        connect: handleConnect,
        disconnect: handleDisconnect,
      }}
    >
      {children}
    </StellarContext.Provider>
  );
}

export function StellarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WalletProvider
      config={{
        network:
          stellarNetwork === "PUBLIC"
            ? NetworkType.PUBLIC
            : NetworkType.TESTNET,
        appName: "Ember",
        autoConnect: true,
      }}
    >
      <StellarProviderInner>
        {children}
      </StellarProviderInner>
    </WalletProvider>
  );
}

export function useStellarWallet() {
  const ctx = useContext(StellarContext);
  if (!ctx) {
    throw new Error("useStellarWallet must be used within StellarProvider");
  }
  return ctx;
}
