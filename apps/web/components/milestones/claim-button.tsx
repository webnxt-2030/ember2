"use client";

import { useState } from "react";
import { formatContractError } from "@ember/shared";
import { useStellarWallet } from "@/components/providers/stellar-provider";
import { simulateAndSubmit } from "@/lib/stellar/contract";
import { u32 } from "@/lib/stellar/scval";
import { getExplorerTxUrl } from "@/lib/stellar/config";
import { Button } from "@/components/ui/button";

interface ClaimButtonProps {
  projectId: string;
  milestoneIndex: number;
  escrowContractId: string;
  orgWallet: string;
  onClaimed?: () => void;
}

type FlowState =
  | { type: "idle" }
  | { type: "confirming" }
  | { type: "pending" }
  | { type: "success"; hash: string };

export function ClaimButton({
  projectId: _projectId,
  milestoneIndex,
  escrowContractId,
  orgWallet,
  onClaimed,
}: ClaimButtonProps) {
  const { wallet, isConnected, connect } = useStellarWallet();
  const [flow, setFlow] = useState<FlowState>({ type: "idle" });
  const [error, setError] = useState<Error | null>(null);

  const isCorrectWallet =
    isConnected && wallet?.address === orgWallet;

  const handleClaim = () => {
    if (!isConnected) {
      void connect();
      return;
    }
    setFlow({ type: "confirming" });
  };

  const handleSend = async () => {
    if (!wallet || flow.type !== "confirming") return;
    setFlow({ type: "pending" });
    setError(null);
    try {
      const { txHash } = await simulateAndSubmit(
        wallet,
        escrowContractId,
        "claim_milestone",
        [u32(milestoneIndex)],
      );
      setFlow({ type: "success", hash: txHash });
      onClaimed?.();
    } catch (err) {
      setError(err as Error);
      setFlow({ type: "idle" });
    }
  };

  const handleReset = () => {
    setFlow({ type: "idle" });
    setError(null);
  };

  if (flow.type === "success") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-tertiary-container/20 p-3 text-label-md text-tertiary">
          <span className="material-symbols-outlined text-[18px]">check</span>
          Claim submitted
        </div>
        <a
          href={getExplorerTxUrl(flow.hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-label-md"
        >
          View on Stellar Explorer
        </a>
        <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">info</span>
          The milestone will show as Claimed once the indexer confirms the
          on-chain event.
        </p>
      </div>
    );
  }

  if (flow.type === "confirming" || flow.type === "pending") {
    return (
      <div className="space-y-3">
        <p className="text-label-md text-on-surface">
          Claim milestone {milestoneIndex + 1} funds?
        </p>
        <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          Claiming requires wallet confirmation and ledger inclusion on Stellar.
          The milestone status will update once the indexer syncs.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              void handleSend();
            }}
            disabled={flow.type === "pending"}
            className="flex-1"
          >
            {flow.type === "pending"
              ? "Confirm in wallet..."
              : "Claim funds"}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={flow.type === "pending"}
          >
            Cancel
          </Button>
        </div>
        {error && (
          <p className="text-label-sm text-error">
            {formatContractError(error)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleClaim}
        disabled={!isConnected || !isCorrectWallet}
        variant="outline-tinted"
        className="w-full"
      >
        <span className="material-symbols-outlined text-[18px] mr-1">payments</span>
        Claim funds
      </Button>
      {isConnected && !isCorrectWallet && (
        <p className="text-label-sm text-error">
          Connect the organization wallet ({orgWallet.slice(0, 4)}...
          {orgWallet.slice(-4)}) to claim.
        </p>
      )}
    </div>
  );
}
