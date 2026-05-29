"use client";

import { useAppKit } from "@reown/appkit/react";
import { useConnection, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected, isConnecting } = useConnection();
  const { mutate: disconnect } = useDisconnect();

  if (isConnecting) {
    return (
      <Button variant="ghost" className={className ?? ""} disabled>
        <span className="material-symbols-outlined text-[18px] animate-spin mr-1">progress_activity</span>
        Connecting...
      </Button>
    );
  }

  if (isConnected && address) {
    return (
      <Button variant="ghost" className={className ?? ""} onClick={() => { disconnect(); }}>
        <span className="material-symbols-outlined text-[18px] mr-1">account_balance_wallet</span>
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button variant="ghost" className={className ?? ""} onClick={() => { void open(); }}>
      <span className="material-symbols-outlined text-[18px] mr-1">account_balance_wallet</span>
      Connect Wallet
    </Button>
  );
}
