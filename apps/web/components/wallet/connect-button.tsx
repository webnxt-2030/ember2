"use client";

import { useStellarWallet } from "@/components/providers/stellar-provider";
import { Button } from "@/components/ui/button";

interface ConnectButtonProps {
  className?: string;
}

function truncateStellarAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { wallet, isConnected, isConnecting, connect, disconnect } =
    useStellarWallet();

  if (isConnecting) {
    return (
      <Button variant="ghost" className={className ?? ""} disabled>
        <span className="material-symbols-outlined text-[18px] animate-spin mr-1">progress_activity</span>
        Connecting...
      </Button>
    );
  }

  if (isConnected && wallet) {
    return (
      <Button
        variant="ghost"
        className={className ?? ""}
        onClick={() => {
          void disconnect();
        }}
      >
        <span className="material-symbols-outlined text-[18px] mr-1">account_balance_wallet</span>
        {truncateStellarAddress(wallet.address)}
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      className={className ?? ""}
      onClick={() => {
        void connect();
      }}
    >
      <span className="material-symbols-outlined text-[18px] mr-1">account_balance_wallet</span>
      Connect Wallet
    </Button>
  );
}
