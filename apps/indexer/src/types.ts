export type ContributedArgs = {
  backer: `0x${string}`;
  amount: bigint;
  tokenId: bigint;
  m0Share: bigint;
};

export type VotedArgs = {
  milestoneIndex: bigint;
  voter: `0x${string}`;
  yes: boolean;
  weight: bigint;
};

export type MilestoneSubmittedArgs = {
  milestoneIndex: bigint;
  updateURI: string;
  voteEndAt: bigint;
};

export type MilestoneResolvedArgs = {
  milestoneIndex: bigint;
  passed: boolean;
  weightYes: bigint;
  weightNo: bigint;
};

export type MilestoneClaimedArgs = {
  milestoneIndex: bigint;
  amount: bigint;
};

export type ProjectCreatedArgs = {
  projectId: bigint;
  organization: `0x${string}`;
  creator: `0x${string}`;
  escrow: `0x${string}`;
  nft: `0x${string}`;
  milestoneBps: readonly bigint[];
  votingPeriod: number;
};