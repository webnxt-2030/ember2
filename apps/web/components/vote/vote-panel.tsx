"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useConnection,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { zeroAddress, formatUnits } from "viem";
import { ProjectEscrowAbi, formatContractError } from "@ember/shared";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface VoteData {
  milestoneIndex: number;
  status: string;
  voteStartAt: string | null;
  voteEndAt: string | null;
  weightYes: string;
  weightNo: string;
  totalContributed: string;
  passed: boolean | null;
  bps: number;
  userVote: { choice: string; weight: string } | null;
  userVotingPower: string;
}

interface VotePanelProps {
  slug: string;
  milestoneIndex: number;
  escrowAddress: `0x${string}`;
}

type VoteChoice = "YES" | "NO";

type FlowState =
  | { type: "idle" }
  | { type: "confirming"; choice: VoteChoice }
  | { type: "success"; hash: `0x${string}`; choice: VoteChoice };

function formatUsd(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function useCountdown(targetDate: string | null) {
  const [remaining, setRemaining] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!targetDate) return;

    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        setRemaining(null);
        return;
      }
      setIsExpired(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (days > 0) {
        setRemaining(`${String(days)}d ${String(hours)}h remaining`);
      } else if (hours > 0) {
        setRemaining(`${String(hours)}h ${String(minutes)}m remaining`);
      } else {
        setRemaining(`${String(minutes)}m remaining`);
      }
    };

    update();
    const id = setInterval(update, 60000);
    return () => { clearInterval(id); };
  }, [targetDate]);

  return { remaining, isExpired };
}

export function VotePanel({ slug, milestoneIndex, escrowAddress }: VotePanelProps) {
  const { address, isConnected } = useConnection();
  const { open } = useAppKit();

  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [isLoadingVoteData, setIsLoadingVoteData] = useState(true);
  const [voteDataError, setVoteDataError] = useState<string | null>(null);
  const [flow, setFlow] = useState<FlowState>({ type: "idle" });
  const [pendingChoice, setPendingChoice] = useState<VoteChoice | null>(null);

  const { remaining, isExpired } = useCountdown(voteData?.voteEndAt ?? null);

  const fetchVoteData = useCallback(async () => {
    setIsLoadingVoteData(true);
    setVoteDataError(null);
    try {
      const url = new URL(
        `/api/projects/${slug}/milestones/${String(milestoneIndex)}/votes`,
        window.location.origin
      );
      if (address) {
        url.searchParams.set("wallet", address);
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        throw new Error("Failed to load vote data");
      }
      const data = (await res.json()) as VoteData;
      setVoteData(data);
    } catch (err) {
      setVoteDataError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoadingVoteData(false);
    }
  }, [slug, milestoneIndex, address]);

  useEffect(() => {
    void fetchVoteData();
  }, [fetchVoteData]);

  const { data: onChainVotingPower } = useReadContract({
    abi: ProjectEscrowAbi,
    address: escrowAddress,
    functionName: "votingPowerOf",
    args: [address ?? zeroAddress],
    query: {
      enabled: !!address && !!escrowAddress,
    },
  });

  const rawOnChainPower = onChainVotingPower != null ? formatUnits(onChainVotingPower, 6) : null;
  const displayVotingPower = rawOnChainPower ?? voteData?.userVotingPower ?? "0";
  const hasVotingPower = parseFloat(displayVotingPower) > 0;
  const alreadyVoted = voteData?.userVote != null;

  const { data: sim, error: simError } = useSimulateContract({
    abi: ProjectEscrowAbi,
    address: escrowAddress,
    functionName: "vote",
    args: [BigInt(milestoneIndex), pendingChoice === "YES"],
    query: {
      enabled:
        flow.type === "confirming" &&
        pendingChoice != null &&
        !!address &&
        hasVotingPower &&
        !alreadyVoted &&
        !isExpired,
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
    if (
      flow.type === "confirming" &&
      isSuccess &&
      hash &&
      pendingChoice
    ) {
      setFlow({ type: "success", hash, choice: pendingChoice });
      void fetchVoteData();
    }
  }, [flow, isSuccess, hash, pendingChoice, fetchVoteData]);

  const handleVote = (choice: VoteChoice) => {
    if (!isConnected) {
      void open();
      return;
    }
    setPendingChoice(choice);
    setFlow({ type: "confirming", choice });
  };

  const handleSend = () => {
    if (!sim?.request) return;
    writeContract(sim.request);
  };

  const handleReset = () => {
    setFlow({ type: "idle" });
    setPendingChoice(null);
  };

  const formatError = formatContractError;

  if (isLoadingVoteData) {
    return (
      <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
        <p className="text-label-md text-on-surface-variant">Loading vote data...</p>
      </div>
    );
  }

  if (voteDataError || !voteData) {
    return (
      <div className="mt-4 rounded-lg border border-outline-variant bg-surface-container-low p-4">
        <p className="text-label-sm text-error">
          {voteDataError ?? "Unable to load vote data"}
        </p>
      </div>
    );
  }

  const weightYesNum = parseFloat(voteData.weightYes);
  const weightNoNum = parseFloat(voteData.weightNo);
  const userVote = voteData.userVote;

  return (
    <div className="mt-4 space-y-4">
      {/* Tally bar */}
      <div className="space-y-1">
        <Progress variant="split" yes={weightYesNum} no={weightNoNum} />
        <div className="flex justify-between text-label-sm">
          <span className="text-tertiary">
            YES {formatUsd(weightYesNum)}
          </span>
          <span className="text-error">
            NO {formatUsd(weightNoNum)}
          </span>
        </div>
        <p className="text-label-sm text-on-surface-variant/60">
          Tallies may lag behind the chain by a few blocks
        </p>
      </div>

      {/* Countdown */}
      {remaining && (
        <div className="flex items-center gap-2 text-label-sm text-primary">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          {remaining}
        </div>
      )}
      {isExpired && (
        <div className="flex items-center gap-2 text-label-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[16px]">lock</span>
          Voting closed
        </div>
      )}

      {/* Voting power */}
      {isConnected && (
        <div className="text-label-sm text-on-surface-variant">
          Your voting power:{" "}
          <span className="font-semibold text-on-surface">
            {formatUsd(displayVotingPower)}
          </span>
        </div>
      )}

      {/* Vote action */}
      {userVote ? (
        <div className="flex items-center gap-2 rounded-lg bg-tertiary-container/20 p-3 text-label-md text-tertiary">
          <span className="material-symbols-outlined text-[18px]">check</span>
          You voted {userVote.choice} with {formatUsd(userVote.weight)}
        </div>
      ) : flow.type === "success" ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-lg bg-tertiary-container/20 p-3 text-label-md text-tertiary">
            <span className="material-symbols-outlined text-[18px]">check</span>
            Vote recorded: {flow.choice}
          </div>
          <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Your vote will be reflected in the tally once the indexer confirms the on-chain event.
          </p>
          <a
            href={`${process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL ?? ''}/tx/${flow.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-label-md"
          >
            View on Morph Explorer
          </a>
        </div>
      ) : flow.type === "confirming" ? (
        <div className="space-y-3">
          <p className="text-label-md text-on-surface">
            Cast {pendingChoice} vote with {formatUsd(displayVotingPower)}?
          </p>
          <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Voting requires wallet confirmation and block mining on Morph L2. Tallies may take a few moments to update while the indexer syncs.
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
                  : `Vote ${String(pendingChoice)}`}
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
      ) : (
        <div className="flex gap-3">
          <Button
            onClick={() => { handleVote("YES"); }}
            disabled={!isConnected || !hasVotingPower || isExpired}
            variant="outline"
            className="flex-1 border-tertiary text-tertiary hover:bg-tertiary-container/20"
          >
            <span className="material-symbols-outlined text-[18px] mr-1">check</span>
            YES
          </Button>
          <Button
            onClick={() => { handleVote("NO"); }}
            disabled={!isConnected || !hasVotingPower || isExpired}
            variant="outline"
            className="flex-1 border-error text-error hover:bg-error-container/20"
          >
            <span className="material-symbols-outlined text-[18px] mr-1">close</span>
            NO
          </Button>
        </div>
      )}

      {!isConnected && (
        <p className="text-label-sm text-on-surface-variant">
          Connect your wallet to vote
        </p>
      )}
      {isConnected && !hasVotingPower && !alreadyVoted && flow.type !== "success" && (
        <p className="text-label-sm text-on-surface-variant">
          You have no voting power for this project. Contribute to receive voting rights.
        </p>
      )}
    </div>
  );
}
