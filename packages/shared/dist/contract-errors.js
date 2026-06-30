/**
 * Maps known contract error names to user-friendly messages.
 * Keep in sync with the Soroban contracts.
 */
const ERROR_MESSAGES = {
    // ProjectEscrow
    ZeroAmount: "Amount must be greater than zero",
    AlreadyVoted: "You have already voted on this milestone",
    NotABacker: "You must be a backer to perform this action",
    VotingWindowClosed: "Voting window has closed",
    OnlyOrg: "Only the organization wallet can perform this action",
    MilestoneNotPassed: "Milestone has not passed voting",
    MilestoneNotVoting: "Milestone is not open for voting",
    MilestoneAlreadyVoting: "Milestone is already being voted on",
    MilestoneIndexOutOfBounds: "Invalid milestone selected",
    MilestoneM0: "Invalid milestone operation",
    VotingNotEnded: "Voting has not ended yet",
    ReentrancyGuardReentrantCall: "Reentrant call detected. Please try again.",
    SafeERC20FailedOperation: "Token transfer failed. Please check your balance and allowance.",
    InvalidBps: "Invalid percentage value",
    // ProjectFactory
    InvalidVotingPeriod: "Invalid voting period",
    ZeroAddress: "Invalid address provided",
    // PositionNFT
    OnlyEscrow: "Only the project escrow can perform this action",
    EscrowAlreadySet: "Escrow address has already been set",
};
/**
 * Soroban/Stellar error messages can contain raw dumps — detect these so we
 * can replace them with a friendly message.
 */
const UNFRIENDLY_PATTERNS = [
    /Unable to decode signature/,
    /reverted with the following signature/,
    /reverted with the following reason/,
    /Contract Call:/,
    /execution reverted/,
    /Details: execution reverted/,
];
function looksLikeUnfriendlyMessage(msg) {
    return UNFRIENDLY_PATTERNS.some((p) => p.test(msg));
}
function extractErrorName(msg) {
    // Try to find a known error name in the message, e.g.:
    //   "The contract function \"contribute\" reverted with the following reason: ZeroAmount"
    const reasonMatch = /reverted with the following reason:\s*(\w+)/.exec(msg);
    if (reasonMatch?.[1])
        return reasonMatch[1];
    // Some SDKs wrap the error name in quotes
    const quotedMatch = /"(\w+)"/.exec(msg);
    if (quotedMatch?.[1] && ERROR_MESSAGES[quotedMatch[1]])
        return quotedMatch[1];
    // Fallback: scan for any known error name as a whole word
    for (const name of Object.keys(ERROR_MESSAGES)) {
        const regex = new RegExp(`\\b${name}\\b`);
        if (regex.test(msg))
            return name;
    }
    return null;
}
/**
 * Format a contract-revert or wallet error into a user-friendly string.
 *
 * @param err     The error thrown by the Soroban SDK / wallet (or null/undefined).
 * @param fallback  Optional fallback message when the error can't be interpreted.
 * @returns A human-readable message, or null if there is no error.
 */
export function formatContractError(err, fallback = "Transaction failed. Please try again or contact support if the problem persists.") {
    if (!err)
        return null;
    const msg = err.message;
    // Wallet rejection – always check first
    if (msg.includes("User rejected") ||
        msg.includes("rejected") ||
        msg.includes("denied") ||
        msg.includes("cancelled") ||
        msg.includes("canceled")) {
        return "Transaction was rejected in your wallet";
    }
    // Try to extract a known error name
    const errorName = extractErrorName(msg);
    if (errorName !== null && errorName in ERROR_MESSAGES) {
        const message = ERROR_MESSAGES[errorName];
        if (message)
            return message;
    }
    // If the message is a raw dump (un-decoded signature, etc.),
    // return the fallback instead of showing the huge stack-like text.
    if (looksLikeUnfriendlyMessage(msg)) {
        return fallback;
    }
    // Otherwise return the original message – it might already be readable
    return msg;
}
/**
 * Convenience hook / helper for components that need a local `formatError`
 * wrapper. Returns the same function signature the UI components already use.
 */
export function makeFormatContractError(fallback) {
    return (err) => formatContractError(err, fallback);
}
//# sourceMappingURL=contract-errors.js.map