export type Address = `0x${string}`;
export type ChainId = 2910 | 2818 | 2810;
export declare enum UserRole {
    BACKER = "BACKER",
    ORG_OWNER = "ORG_OWNER",
    SUPER_ADMIN = "SUPER_ADMIN"
}
export declare enum ProjectStatus {
    DRAFT = "DRAFT",
    LIVE = "LIVE",
    COMPLETED = "COMPLETED",
    PAUSED = "PAUSED",
    CANCELLED = "CANCELLED"
}
export declare enum MilestoneStatus {
    PENDING = "PENDING",
    AUTO_RELEASED = "AUTO_RELEASED",
    VOTING = "VOTING",
    PASSED = "PASSED",
    FAILED = "FAILED",
    CLAIMED = "CLAIMED"
}
export declare enum RewardCurve {
    LINEAR = "LINEAR",
    EXPONENTIAL = "EXPONENTIAL",
    BINARY = "BINARY",
    CUSTOM = "CUSTOM"
}
export declare enum VoteChoice {
    YES = "YES",
    NO = "NO"
}
export declare enum VerificationStatus {
    PENDING = "PENDING",
    VERIFIED = "VERIFIED",
    REJECTED = "REJECTED"
}
export type OrgVerifiedStatus = "UNVERIFIED" | "VERIFIED" | "REJECTED";
//# sourceMappingURL=index.d.ts.map