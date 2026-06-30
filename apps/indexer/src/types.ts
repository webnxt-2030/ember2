export interface ContributedArgs {
  backer: string;
  amount: bigint;
  tokenId: number;
  m0Share: bigint;
}

export interface VotedArgs {
  milestoneIndex: number;
  voter: string;
  yes: boolean;
  weight: bigint;
}

export interface MilestoneSubmittedArgs {
  milestoneIndex: number;
  updateURI: string;
  voteEndAt: number;
}

export interface MilestoneResolvedArgs {
  milestoneIndex: number;
  passed: boolean;
  weightYes: bigint;
  weightNo: bigint;
}

export interface MilestoneClaimedArgs {
  milestoneIndex: number;
  amount: bigint;
}

export interface ProjectCreatedArgs {
  projectId: number;
  organization: string;
  creator: string;
  escrow: string;
  nft: string;
  milestoneBps: readonly number[];
  votingPeriod: number;
}

export interface EventHandlerContext {
  contract: string;
  ledgerSequence: number;
  txHash: string;
  eventIndex: number;
}
