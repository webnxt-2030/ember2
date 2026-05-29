"use client";

import { useAppKit } from "@reown/appkit/react";
import { useConnection, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";

interface ConnectButtonProps {
  className?: string;
}

export function ConnectButton({ className }: ConnectButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useConnection();
  const { mutate: disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <Button variant="ghost" className={className ?? ""} onClick={() => { disconnect(); }}>
        {address.slice(0, 6)}...{address.slice(-4)}
      </Button>
    );
  }

  return (
    <Button variant="ghost" className={className ?? ""} onClick={() => { void open(); }}>
      Connect Wallet
    </Button>
  );
}
