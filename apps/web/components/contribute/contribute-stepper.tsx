"use client";

import { useState, useEffect, useMemo } from "react";
import {
  useConnection,
  useReadContract,
  useSimulateContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { parseUnits, zeroAddress } from "viem";
import {
  ERC20Abi,
  ProjectEscrowAbi,
  USDT_DECIMALS,
  usdtAmountSchema,
  formatContractError,
} from "@ember/shared";

const USDT_ADDRESS = (process.env.NEXT_PUBLIC_USDT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";

interface ContributeStepperProps {
  escrowAddress: `0x${string}`;
  projectId: string;
}

export function ContributeStepper({
  escrowAddress,
  projectId: _projectId,
}: ContributeStepperProps) {
  const { address, isConnected } = useConnection();
  const { open } = useAppKit();

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedAmount, setSubmittedAmount] = useState<bigint | null>(null);
  const [needsApprove, setNeedsApprove] = useState<boolean | null>(null);

  type FlowState =
    | { type: "idle" }
    | { type: "checking" }
    | { type: "approve" }
    | { type: "contribute" }
    | { type: "success"; hash: `0x${string}` };

  const [flow, setFlow] = useState<FlowState>({ type: "idle" });

  const parsedAmount = useMemo(() => {
    const result = usdtAmountSchema.safeParse(amount);
    if (!result.success) return null;
    try {
      return parseUnits(amount, USDT_DECIMALS);
    } catch {
      return null;
    }
  }, [amount]);

  const {
    data: allowance,
    isLoading: isAllowanceLoading,
    error: allowanceError,
  } = useReadContract({
    abi: ERC20Abi,
    address: USDT_ADDRESS,
    functionName: "allowance",
    args: [address ?? zeroAddress, escrowAddress],
    query: {
      enabled:
        !!address &&
        flow.type !== "idle" &&
        flow.type !== "success",
    },
  });

  useEffect(() => {
    if (flow.type === "checking") {
      if (allowanceError) {
        console.error("[ContributeStepper] Allowance read failed:", allowanceError);
        console.error("  USDT address:", USDT_ADDRESS);
        console.error("  Escrow address:", escrowAddress);
        console.error("  Wallet address:", address);
        setError(`Failed to read USDT allowance: ${allowanceError.message}`);
        setFlow({ type: "idle" });
        return;
      }
      if (!isAllowanceLoading && allowance !== undefined) {
        const needs = submittedAmount !== null && allowance < submittedAmount;
        setNeedsApprove(needs);
        setFlow(needs ? { type: "approve" } : { type: "contribute" });
      }
    }
  }, [flow, isAllowanceLoading, allowance, allowanceError, submittedAmount]);

  const { data: approveSim, error: approveSimError } = useSimulateContract({
    abi: ERC20Abi,
    address: USDT_ADDRESS,
    functionName: "approve",
    args: [escrowAddress, submittedAmount ?? 0n],
    query: {
      enabled:
        flow.type === "approve" &&
        submittedAmount !== null &&
        submittedAmount > 0n,
    },
  });

  const {
    mutate: writeApprove,
    isPending: isApprovePending,
    error: approveWriteError,
    data: approveHash,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({
      hash: approveHash,
    });

  useEffect(() => {
    if (flow.type === "approve" && isApproveConfirmed) {
      setFlow({ type: "contribute" });
    }
  }, [flow, isApproveConfirmed]);

  const { data: contributeSim, error: contributeSimError } =
    useSimulateContract({
      abi: ProjectEscrowAbi,
      address: escrowAddress,
      functionName: "contribute",
      args: [submittedAmount ?? 0n],
      query: {
        enabled:
          flow.type === "contribute" &&
          submittedAmount !== null &&
          submittedAmount > 0n,
      },
    });

  const {
    mutate: writeContribute,
    isPending: isContributePending,
    error: contributeWriteError,
    data: contributeHash,
  } = useWriteContract();

  const { isLoading: isContributeConfirming, isSuccess: isContributeConfirmed } =
    useWaitForTransactionReceipt({
      hash: contributeHash,
    });

  useEffect(() => {
    if (
      flow.type === "contribute" &&
      isContributeConfirmed &&
      contributeHash
    ) {
      setFlow({ type: "success", hash: contributeHash });
    }
  }, [flow, isContributeConfirmed, contributeHash]);

  const handleContinue = () => {
    setError(null);
    if (!isConnected) {
      void open();
      return;
    }
    if (!parsedAmount || parsedAmount <= 0n) {
      setError("Please enter a valid USDT amount greater than zero");
      return;
    }
    setSubmittedAmount(parsedAmount);
    setFlow({ type: "checking" });
  };

  const handleApprove = () => {
    if (!approveSim?.request) return;
    writeApprove(approveSim.request);
  };

  const handleContribute = () => {
    if (!contributeSim?.request) return;
    writeContribute(contributeSim.request);
  };

  const handleReset = () => {
    setAmount("");
    setError(null);
    setSubmittedAmount(null);
    setNeedsApprove(null);
    setFlow({ type: "idle" });
  };

  const steps =
    needsApprove === true
      ? ["Approve USDT", "Contribute"]
      : needsApprove === false
        ? ["Contribute"]
        : [];

  const currentStep =
    flow.type === "approve"
      ? 1
      : flow.type === "contribute"
        ? needsApprove
          ? 2
          : 1
        : 1;

  const formatError = formatContractError;

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Contribute</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {flow.type === "idle" || flow.type === "checking" ? (
          <>
            {flow.type === "checking" ? (
              <div className="py-4 text-center">
                <p className="text-body-md text-on-surface-variant">
                  Checking USDT allowance...
                </p>
              </div>
            ) : (
              <Input
                label="Amount (USDT)"
                placeholder="0.00"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); }}
                {...(error ? { error } : {})}
              />
            )}
            <Button
              onClick={handleContinue}
              disabled={flow.type === "checking"}
            >
              {isConnected
                ? flow.type === "checking"
                  ? "Checking..."
                  : "Continue"
                : "Connect Wallet"}
            </Button>
          </>
        ) : flow.type === "approve" || flow.type === "contribute" ? (
          <>
            {steps.length > 0 && (
              <Stepper steps={steps} currentStep={currentStep} />
            )}
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Transactions require wallet confirmation and block mining on Morph L2. The UI updates once the indexer syncs.
              </p>
              {flow.type === "approve" && (
                <>
                  <Button
                    onClick={handleApprove}
                    disabled={
                      !approveSim?.request ||
                      isApprovePending ||
                      isApproveConfirming
                    }
                  >
                    {isApprovePending
                      ? "Confirm in wallet..."
                      : isApproveConfirming
                        ? "Confirming..."
                        : "Approve USDT"}
                  </Button>
                  {formatError(approveSimError ?? approveWriteError) && (
                    <p className="text-label-sm text-error">
                      {formatError(approveSimError ?? approveWriteError)}
                    </p>
                  )}
                </>
              )}
              {flow.type === "contribute" && (
                <>
                  <Button
                    onClick={handleContribute}
                    disabled={
                      !contributeSim?.request ||
                      isContributePending ||
                      isContributeConfirming
                    }
                  >
                    {isContributePending
                      ? "Confirm in wallet..."
                      : isContributeConfirming
                        ? "Confirming..."
                        : "Contribute"}
                  </Button>
                  {formatError(contributeSimError ?? contributeWriteError) && (
                    <p className="text-label-sm text-error">
                      {formatError(contributeSimError ?? contributeWriteError)}
                    </p>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-4 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h3 className="text-headline-sm text-on-surface">
                Contribution Sent
              </h3>
              <p className="text-body-md text-on-surface-variant mt-1">
                You contributed {amount} USDT
              </p>
              <p className="text-label-sm text-on-surface-variant mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Your contribution will appear in the project total once the indexer confirms the on-chain event.
              </p>
            </div>
            <a
              href={`${process.env.NEXT_PUBLIC_MORPH_EXPLORER_URL ?? ''}/tx/${flow.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-label-md"
            >
              View on Morph Explorer
            </a>
            <Button onClick={handleReset} variant="outline">
              Make Another Contribution
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
