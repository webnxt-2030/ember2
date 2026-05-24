// Shared TypeScript types for the Ember dApp
// Full type definitions will be added in Issue #4

export type Address = `0x${string}`;

export type ChainId = 2818 | 2810; // Morph Mainnet | Morph Hoodi Testnet

export type RewardCurve = "LINEAR" | "EXPONENTIAL" | "BINARY" | "CUSTOM";

export type ProjectStatus = "DRAFT" | "LIVE" | "FUNDED" | "COMPLETED" | "CANCELLED";

export type MilestoneStatus = "PENDING" | "SUBMITTED" | "VOTING" | "APPROVED" | "REJECTED";

export type UserRole = "BACKER" | "ORG_OWNER" | "SUPER_ADMIN";

export type OrgVerifiedStatus = "UNVERIFIED" | "VERIFIED" | "REJECTED";
