"use client";

import { useState, useMemo } from "react";
import {
  USDC_DECIMALS,
  usdcAmountSchema,
  formatContractError,
} from "@ember/shared";
import { useStellarWallet } from "@/components/providers/stellar-provider";
import { scValToBigInt } from "@stellar/stellar-sdk";
import {
  readContract,
  simulateAndSubmit,
} from "@/lib/stellar/contract";
import {
  address,
  i128,
  u32,
} from "@/lib/stellar/scval";
import { usdcContractId, getExplorerTxUrl } from "@/lib/stellar/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Stepper } from "@/components/ui/stepper";

interface ContributeStepperProps {
  escrowContractId: string;
  projectId: string;
}

export function ContributeStepper({
  escrowContractId,
  projectId: _projectId,
}: ContributeStepperProps) {
  const { wallet, isConnected, connect } = useStellarWallet();

  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<
    | { type: "idle" }
    | { type: "checking" }
    | { type: "approve"; amount: bigint }
    | { type: "contribute"; amount: bigint }
    | { type: "success"; hash: string }
    | { type: "pending"; message: string }
  >({ type: "idle" });

  const parsedAmount = useMemo(() => {
    const result = usdcAmountSchema.safeParse(amount);
    if (!result.success) return null;
    try {
      // Convert decimal string to raw units
      const [whole = "0", fraction = ""] = amount.split(".");
      const padded = (fraction + "0".repeat(USDC_DECIMALS)).slice(
        0,
        USDC_DECIMALS,
      );
      return BigInt(whole + padded);
    } catch {
      return null;
    }
  }, [amount]);

  async function checkAllowance(rawAmount: bigint) {
    if (!wallet) return false;
    try {
      const result = await readContract(usdcContractId, "allowance", [
        address(wallet.address),
        address(escrowContractId),
      ]);
      const allowance = result ? scValToBigInt(result.retval) : 0n;
      return allowance >= rawAmount;
    } catch (err) {
      console.error("[ContributeStepper] Allowance read failed:", err);
      setError("Failed to read USDC allowance");
      return false;
    }
  }

  const handleContinue = async () => {
    setError(null);
    if (!isConnected) {
      await connect();
      return;
    }
    if (!wallet) {
      setError("Wallet not connected");
      return;
    }
    if (!parsedAmount || parsedAmount <= 0n) {
      setError("Please enter a valid USDC amount greater than zero");
      return;
    }

    setFlow({ type: "checking" });
    const allowed = await checkAllowance(parsedAmount);
    if (error) return;
    setFlow(
      allowed
        ? { type: "contribute", amount: parsedAmount }
        : { type: "approve", amount: parsedAmount },
    );
  };

  const handleApprove = async () => {
    if (!wallet || flow.type !== "approve") return;
    setFlow({ type: "pending", message: "Approve USDC in your wallet..." });
    try {
      await simulateAndSubmit(wallet, usdcContractId, "approve", [
        address(wallet.address),
        address(escrowContractId),
        i128(flow.amount),
        u32(Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30), // 30 days
      ]);
      setFlow({ type: "contribute", amount: flow.amount });
    } catch (err) {
      setError(formatContractError(err as Error) ?? "Approval failed");
      setFlow({ type: "idle" });
    }
  };

  const handleContribute = async () => {
    if (!wallet || flow.type !== "contribute") return;
    setFlow({ type: "pending", message: "Confirm contribution in your wallet..." });
    try {
      const { txHash } = await simulateAndSubmit(
        wallet,
        escrowContractId,
        "contribute",
        [address(wallet.address), i128(flow.amount)],
      );
      setFlow({ type: "success", hash: txHash });
    } catch (err) {
      setError(formatContractError(err as Error) ?? "Contribution failed");
      setFlow({ type: "idle" });
    }
  };

  const handleReset = () => {
    setAmount("");
    setError(null);
    setFlow({ type: "idle" });
  };

  const needsApprove = flow.type === "approve";
  const steps = needsApprove ? ["Approve USDC", "Contribute"] : ["Contribute"];
  const currentStep = needsApprove ? 1 : 1;

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
                  Checking USDC allowance...
                </p>
              </div>
            ) : (
              <Input
                label="Amount (USDC)"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                }}
                {...(error ? { error } : {})}
              />
            )}
            <Button
              onClick={() => {
                void handleContinue();
              }}
              disabled={flow.type === "checking"}
            >
              {isConnected
                ? flow.type === "checking"
                  ? "Checking..."
                  : "Continue"
                : "Connect Wallet"}
            </Button>
          </>
        ) : flow.type === "pending" ? (
          <div className="py-4 text-center">
            <p className="text-body-md text-on-surface-variant">{flow.message}</p>
          </div>
        ) : flow.type === "approve" || flow.type === "contribute" ? (
          <>
            {steps.length > 0 && (
              <Stepper steps={steps} currentStep={currentStep} />
            )}
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Transactions require wallet confirmation and ledger inclusion on
                Stellar. The UI updates once the indexer syncs.
              </p>
              {flow.type === "approve" && (
                <Button
                  onClick={() => {
                    void handleApprove();
                  }}
                >
                  Approve USDC
                </Button>
              )}
              {flow.type === "contribute" && (
                <Button
                  onClick={() => {
                    void handleContribute();
                  }}
                >
                  Contribute
                </Button>
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
              <h3 className="text-headline-sm text-on-surface">Contribution Sent</h3>
              <p className="text-body-md text-on-surface-variant mt-1">
                You contributed {amount} USDC
              </p>
              <p className="text-label-sm text-on-surface-variant mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                Your contribution will appear in the project total once the
                indexer confirms the on-chain event.
              </p>
            </div>
            <a
              href={getExplorerTxUrl(flow.hash)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-label-md"
            >
              View on Stellar Explorer
            </a>
            <Button onClick={handleReset} variant="outline">
              Make Another Contribution
            </Button>
          </div>
        )}
        {error && (
          <p className="text-label-sm text-error">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
