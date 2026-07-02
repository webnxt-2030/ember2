import { describe, it, expect } from "vitest";
import { formatContractError } from "./contract-errors.js";

describe("formatContractError", () => {
  it("returns null for null/undefined", () => {
    expect(formatContractError(null)).toBeNull();
    expect(formatContractError(undefined)).toBeNull();
  });

  it("detects wallet rejection", () => {
    expect(
      formatContractError(new Error("User rejected the request"))
    ).toBe("Transaction was rejected in your wallet");
    expect(
      formatContractError(new Error("Request rejected"))
    ).toBe("Transaction was rejected in your wallet");
    expect(
      formatContractError(new Error("User denied transaction signature"))
    ).toBe("Transaction was rejected in your wallet");
  });

  it("maps known contract errors", () => {
    expect(
      formatContractError(
        new Error(
          'The contract function "contribute" reverted with the following reason: ZeroAmount'
        )
      )
    ).toBe("Amount must be greater than zero");

    expect(
      formatContractError(
        new Error(
          'The contract function "vote" reverted with the following reason: AlreadyVoted'
        )
      )
    ).toBe("You have already voted on this milestone");

    expect(
      formatContractError(new Error("VotingWindowClosed somewhere in the msg"))
    ).toBe("Voting window has closed");
  });

  it("replaces raw error dumps with the fallback", () => {
    const raw =
      'The contract function "contribute" reverted with the following signature: 0xe450d38c. ' +
      'Unable to decode signature "0xe450d38c" as it was not found on the provided ABI. ' +
      "Contract Call: address: C... Details: execution reverted";

    expect(formatContractError(new Error(raw))).toBe(
      "Transaction failed. Please try again or contact support if the problem persists."
    );
  });

  it("uses custom fallback when provided", () => {
    const raw =
      "The contract function reverted with the following signature: 0xdeadbeef";
    expect(formatContractError(new Error(raw), "Custom fallback")).toBe(
      "Custom fallback"
    );
  });

  it("returns original message for readable errors", () => {
    expect(formatContractError(new Error("Network error"))).toBe(
      "Network error"
    );
  });
});
