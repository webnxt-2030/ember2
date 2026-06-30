"use client";

import { useState, useEffect, useCallback } from "react";
import {
  USDC_DECIMALS,
  formatContractError,
} from "@ember/shared";
import { useStellarWallet } from "@/components/providers/stellar-provider";
import { scValToBigInt } from "@stellar/stellar-sdk";
import { readContract, simulateAndSubmit } from "@/lib/stellar/contract";
import { address, bool, u32 } from "@/lib/stellar/scval";
import { getExplorerTxUrl } from "@/lib/stellar/config";
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
  escrowContractId: string;
}

type VoteChoice = "YES" | "NO";

type FlowState =
  | { type: "idle" }
  | { type: "confirming"; choice: VoteChoice }
  | { type: "pending"; choice: VoteChoice }
  | { type: "success"; hash: string; choice: VoteChoice };

function formatUsd(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

function formatUnits(value: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(decimals, "0");
  const trimmed = fractionStr.replace(/0+$/, "");
  return trimmed ? `${String(whole)}.${trimmed}` : whole.toString();
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
    return () => {
      clearInterval(id);
    };
  }, [targetDate]);

  return { remaining, isExpired };
}

export function VotePanel({
  slug,
  milestoneIndex,
  escrowContractId,
}: VotePanelProps) {
  const { wallet, isConnected, connect } = useStellarWallet();

  const [voteData, setVoteData] = useState<VoteData | null>(null);
  const [isLoadingVoteData, setIsLoadingVoteData] = useState(true);
  const [voteDataError, setVoteDataError] = useState<string | null>(null);
  const [flow, setFlow] = useState<FlowState>({ type: "idle" });
  const [pendingChoice, setPendingChoice] = useState<VoteChoice | null>(null);
  const [onChainVotingPower, setOnChainVotingPower] = useState<bigint | null>(
    null,
  );
  const [contractError, setContractError] = useState<Error | null>(null);

  const { remaining, isExpired } = useCountdown(voteData?.voteEndAt ?? null);

  const fetchVoteData = useCallback(async () => {
    setIsLoadingVoteData(true);
    setVoteDataError(null);
    try {
      const url = new URL(
        `/api/projects/${slug}/milestones/${String(milestoneIndex)}/votes`,
        window.location.origin,
      );
      if (wallet?.address) {
        url.searchParams.set("wallet", wallet.address);
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
  }, [slug, milestoneIndex, wallet?.address]);

  useEffect(() => {
    void fetchVoteData();
  }, [fetchVoteData]);

  useEffect(() => {
    if (!wallet?.address || !escrowContractId) return;
    readContract(escrowContractId, "voting_power_of", [
      address(wallet.address),
    ])
      .then((result) => {
        if (result) {
          setOnChainVotingPower(scValToBigInt(result.retval));
        }
      })
      .catch((err: unknown) => {
        console.error("Failed to read voting power:", err);
      });
  }, [wallet?.address, escrowContractId]);

  const rawOnChainPower = onChainVotingPower
    ? formatUnits(onChainVotingPower, USDC_DECIMALS)
    : null;
  const displayVotingPower = rawOnChainPower ?? voteData?.userVotingPower ?? "0";
  const hasVotingPower = parseFloat(displayVotingPower) > 0;
  const alreadyVoted = voteData?.userVote != null;

  const handleVote = (choice: VoteChoice) => {
    if (!isConnected) {
      void connect();
      return;
    }
    setPendingChoice(choice);
    setFlow({ type: "confirming", choice });
  };

  const handleSend = async () => {
    if (!wallet || !pendingChoice || flow.type !== "confirming") return;
    setFlow({ type: "pending", choice: pendingChoice });
    setContractError(null);
    try {
      const { txHash } = await simulateAndSubmit(
        wallet,
        escrowContractId,
        "vote",
        [
          address(wallet.address),
          u32(milestoneIndex),
          bool(pendingChoice === "YES"),
        ],
      );
      setFlow({ type: "success", hash: txHash, choice: pendingChoice });
      void fetchVoteData();
    } catch (err) {
      setContractError(err as Error);
      setFlow({ type: "idle" });
      setPendingChoice(null);
    }
  };

  const handleReset = () => {
    setFlow({ type: "idle" });
    setPendingChoice(null);
    setContractError(null);
  };

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
      <div className="space-y-1">
        <Progress variant="split" yes={weightYesNum} no={weightNoNum} />
        <div className="flex justify-between text-label-sm">
          <span className="text-tertiary">YES {formatUsd(weightYesNum)}</span>
          <span className="text-error">NO {formatUsd(weightNoNum)}</span>
        </div>
        <p className="text-label-sm text-on-surface-variant/60">
          Tallies may lag behind the chain by a few ledgers
        </p>
      </div>

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

      {isConnected && (
        <div className="text-label-sm text-on-surface-variant">
          Your voting power:{" "}
          <span className="font-semibold text-on-surface">
            {formatUsd(displayVotingPower)}
          </span>
        </div>
      )}

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
            Your vote will be reflected in the tally once the indexer confirms
            the on-chain event.
          </p>
          <a
            href={getExplorerTxUrl(flow.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-label-md"
          >
            View on Stellar Explorer
          </a>
        </div>
      ) : flow.type === "confirming" || flow.type === "pending" ? (
        <div className="space-y-3">
          <p className="text-label-md text-on-surface">
            Cast {pendingChoice} vote with {formatUsd(displayVotingPower)}?
          </p>
          <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            Voting requires wallet confirmation and ledger inclusion on Stellar.
            Tallies may take a few moments to update while the indexer syncs.
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
                : `Vote ${String(pendingChoice)}`}
            </Button>
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={flow.type === "pending"}
            >
              Cancel
            </Button>
          </div>
          {contractError && (
            <p className="text-label-sm text-error">
              {formatContractError(contractError)}
            </p>
          )}
        </div>
      ) : (
        <div className="flex gap-3">
          <Button
            onClick={() => {
              handleVote("YES");
            }}
            disabled={!isConnected || !hasVotingPower || isExpired}
            variant="outline"
            className="flex-1 border-tertiary text-tertiary hover:bg-tertiary-container/20"
          >
            <span className="material-symbols-outlined text-[18px] mr-1">check</span>
            YES
          </Button>
          <Button
            onClick={() => {
              handleVote("NO");
            }}
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
      {isConnected &&
        !hasVotingPower &&
        !alreadyVoted &&
        flow.type !== "success" && (
          <p className="text-label-sm text-on-surface-variant">
            You have no voting power for this project. Contribute to receive
            voting rights.
          </p>
        )}
    </div>
  );
}
