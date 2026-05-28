"use client";

import { useState, useEffect } from "react";
import {
  useConnection,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { ProjectEscrowAbi } from "@ember/shared";
import { Button } from "@/components/ui/button";

interface ClaimButtonProps {
  projectId: string;
  milestoneIndex: number;
  escrowAddress: `0x${string}`;
  orgWallet: `0x${string}`;
  onClaimed?: () => void;
}

type FlowState =
  | { type: "idle" }
  | { type: "confirming" }
  | { type: "success"; hash: `0x${string}` };

export function ClaimButton({
  projectId: _projectId,
  milestoneIndex,
  escrowAddress,
  orgWallet,
  onClaimed,
}: ClaimButtonProps) {
  const { address, isConnected } = useConnection();
  const { open } = useAppKit();
  const [flow, setFlow] = useState<FlowState>({ type: "idle" });

  const isCorrectWallet = isConnected && address?.toLowerCase() === orgWallet.toLowerCase();

  const { data: sim, error: simError } = useSimulateContract({
    abi: ProjectEscrowAbi,
    address: escrowAddress,
    functionName: "claimMilestone",
    args: [BigInt(milestoneIndex)],
    query: {
      enabled: flow.type === "confirming" && isCorrectWallet,
    },
  });

  const {
    mutate: writeContract,
    isPending: isWritePending,
    error: writeError,
    data: hash,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  useEffect(() => {
    if (flow.type === "confirming" && isSuccess && hash) {
      setFlow({ type: "success", hash });
      onClaimed?.();
    }
  }, [flow, isSuccess, hash, onClaimed]);

  const handleClaim = () => {
    if (!isConnected) {
      void open();
      return;
    }
    setFlow({ type: "confirming" });
  };

  const handleSend = () => {
    if (!sim?.request) return;
    writeContract(sim.request);
  };

  const handleReset = () => {
    setFlow({ type: "idle" });
  };

  const formatError = (err: Error | null | undefined): string | null => {
    if (!err) return null;
    const msg = err.message;
    if (msg.includes("User rejected") || msg.includes("rejected")) {
      return "Transaction was rejected in your wallet";
    }
    if (msg.includes("OnlyOrg")) {
      return "Only the organization wallet can claim this milestone";
    }
    if (msg.includes("MilestoneNotPassed")) {
      return "Milestone has not passed voting";
    }
    return msg;
  };

  if (flow.type === "success") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg bg-tertiary-container/20 p-3 text-label-md text-tertiary">
          <span className="material-symbols-outlined text-[18px]">check</span>
          Claim submitted
        </div>
        <a
          href={`${process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL ?? ''}/tx/${flow.hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-label-md"
        >
          View on Morph Explorer
        </a>
        <p className="text-label-sm text-on-surface-variant">
          The milestone will show as Claimed once the indexer confirms the on-chain event.
        </p>
      </div>
    );
  }

  if (flow.type === "confirming") {
    return (
      <div className="space-y-3">
        <p className="text-label-md text-on-surface">
          Claim milestone {milestoneIndex + 1} funds?
        </p>
        <div className="flex gap-3">
          <Button
            onClick={handleSend}
            disabled={!sim?.request || isWritePending || isConfirming}
            className="flex-1"
          >
            {isWritePending
              ? "Confirm in wallet..."
              : isConfirming
                ? "Confirming..."
                : "Claim funds"}
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            disabled={isWritePending || isConfirming}
          >
            Cancel
          </Button>
        </div>
        {formatError(simError ?? writeError) && (
          <p className="text-label-sm text-error">
            {formatError(simError ?? writeError)}
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
          Connect the organization wallet ({orgWallet.slice(0, 6)}...{orgWallet.slice(-4)}) to claim.
        </p>
      )}
    </div>
  );
}
