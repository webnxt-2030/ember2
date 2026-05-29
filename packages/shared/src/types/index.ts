export type Address = `0x${string}`;

export type ChainId = 2910 | 2818 | 2810;

export enum UserRole {
  BACKER = "BACKER",
  ORG_OWNER = "ORG_OWNER",
  SUPER_ADMIN = "SUPER_ADMIN",
}

export enum ProjectStatus {
  DRAFT = "DRAFT",
  LIVE = "LIVE",
  COMPLETED = "COMPLETED",
  PAUSED = "PAUSED",
  CANCELLED = "CANCELLED",
}

export enum MilestoneStatus {
  PENDING = "PENDING",
  AUTO_RELEASED = "AUTO_RELEASED",
  VOTING = "VOTING",
  PASSED = "PASSED",
  FAILED = "FAILED",
  CLAIMED = "CLAIMED",
}

export enum RewardCurve {
  LINEAR = "LINEAR",
  EXPONENTIAL = "EXPONENTIAL",
  BINARY = "BINARY",
  CUSTOM = "CUSTOM",
}

export enum VoteChoice {
  YES = "YES",
  NO = "NO",
}

export enum VerificationStatus {
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export type OrgVerifiedStatus = "UNVERIFIED" | "VERIFIED" | "REJECTED";
