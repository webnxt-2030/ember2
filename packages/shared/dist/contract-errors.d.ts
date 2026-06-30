/**
 * Format a contract-revert or wallet error into a user-friendly string.
 *
 * @param err     The error thrown by the Soroban SDK / wallet (or null/undefined).
 * @param fallback  Optional fallback message when the error can't be interpreted.
 * @returns A human-readable message, or null if there is no error.
 */
export declare function formatContractError(err: Error | null | undefined, fallback?: string): string | null;
/**
 * Convenience hook / helper for components that need a local `formatError`
 * wrapper. Returns the same function signature the UI components already use.
 */
export declare function makeFormatContractError(fallback?: string): (err: Error | null | undefined) => string | null;
//# sourceMappingURL=contract-errors.d.ts.map