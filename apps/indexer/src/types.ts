export interface ContributedArgs {
  backer: `0x${string}`;
  amount: bigint;
  tokenId: bigint;
  m0Share: bigint;
}

export interface VotedArgs {
  milestoneIndex: bigint;
  voter: `0x${string}`;
  yes: boolean;
  weight: bigint;
}

export interface MilestoneSubmittedArgs {
  milestoneIndex: bigint;
  updateURI: string;
  voteEndAt: bigint;
}

export interface MilestoneResolvedArgs {
  milestoneIndex: bigint;
  passed: boolean;
  weightYes: bigint;
  weightNo: bigint;
}

export interface MilestoneClaimedArgs {
  milestoneIndex: bigint;
  amount: bigint;
}

export interface ProjectCreatedArgs {
  projectId: bigint;
  organization: `0x${string}`;
  creator: `0x${string}`;
  escrow: `0x${string}`;
  nft: `0x${string}`;
  milestoneBps: readonly bigint[];
  votingPeriod: number;
}

export interface EventHandlerContext {
  contract: `0x${string}`;
  blockNumber: bigint;
  txHash: `0x${string}`;
  logIndex: number;
}