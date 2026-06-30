export declare const ProjectEscrowAbi: readonly [{
    readonly type: "constructor";
    readonly inputs: readonly [{
        readonly name: "usdt_";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "nft_";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "organizationWallet_";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "milestoneBps_";
        readonly type: "uint16[]";
        readonly internalType: "uint16[]";
    }, {
        readonly name: "votingPeriod_";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "claimMilestone";
    readonly inputs: readonly [{
        readonly name: "milestoneIndex";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "contribute";
    readonly inputs: readonly [{
        readonly name: "amount";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "milestoneAllocated";
    readonly inputs: readonly [{
        readonly name: "index";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "milestoneBps";
    readonly inputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint16";
        readonly internalType: "uint16";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "milestoneStatus";
    readonly inputs: readonly [{
        readonly name: "index";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint8";
        readonly internalType: "enum ProjectEscrow.Status";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "nft";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
        readonly internalType: "contract PositionNFT";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "organizationWallet";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
        readonly internalType: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "resolveMilestone";
    readonly inputs: readonly [{
        readonly name: "milestoneIndex";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "submitMilestone";
    readonly inputs: readonly [{
        readonly name: "milestoneIndex";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }, {
        readonly name: "updateURI";
        readonly type: "string";
        readonly internalType: "string";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "totalContributed";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "totalContributedBy";
    readonly inputs: readonly [{
        readonly name: "";
        readonly type: "address";
        readonly internalType: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "usdt";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
        readonly internalType: "contract IERC20";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "vote";
    readonly inputs: readonly [{
        readonly name: "milestoneIndex";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }, {
        readonly name: "yes";
        readonly type: "bool";
        readonly internalType: "bool";
    }];
    readonly outputs: readonly [];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "votingPeriod";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "votingPowerOf";
    readonly inputs: readonly [{
        readonly name: "backer";
        readonly type: "address";
        readonly internalType: "address";
    }];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "Contributed";
    readonly inputs: readonly [{
        readonly name: "backer";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }, {
        readonly name: "tokenId";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }, {
        readonly name: "m0Share";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MilestoneClaimed";
    readonly inputs: readonly [{
        readonly name: "milestoneIndex";
        readonly type: "uint256";
        readonly indexed: true;
        readonly internalType: "uint256";
    }, {
        readonly name: "amount";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MilestoneResolved";
    readonly inputs: readonly [{
        readonly name: "milestoneIndex";
        readonly type: "uint256";
        readonly indexed: true;
        readonly internalType: "uint256";
    }, {
        readonly name: "passed";
        readonly type: "bool";
        readonly indexed: false;
        readonly internalType: "bool";
    }, {
        readonly name: "weightYes";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }, {
        readonly name: "weightNo";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "MilestoneSubmitted";
    readonly inputs: readonly [{
        readonly name: "milestoneIndex";
        readonly type: "uint256";
        readonly indexed: true;
        readonly internalType: "uint256";
    }, {
        readonly name: "updateURI";
        readonly type: "string";
        readonly indexed: false;
        readonly internalType: "string";
    }, {
        readonly name: "voteEndAt";
        readonly type: "uint64";
        readonly indexed: false;
        readonly internalType: "uint64";
    }];
    readonly anonymous: false;
}, {
    readonly type: "event";
    readonly name: "Voted";
    readonly inputs: readonly [{
        readonly name: "milestoneIndex";
        readonly type: "uint256";
        readonly indexed: true;
        readonly internalType: "uint256";
    }, {
        readonly name: "voter";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "yes";
        readonly type: "bool";
        readonly indexed: false;
        readonly internalType: "bool";
    }, {
        readonly name: "weight";
        readonly type: "uint256";
        readonly indexed: false;
        readonly internalType: "uint256";
    }];
    readonly anonymous: false;
}, {
    readonly type: "error";
    readonly name: "AlreadyVoted";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidBps";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "MilestoneAlreadyVoting";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "MilestoneIndexOutOfBounds";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "MilestoneM0";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "MilestoneNotPassed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "MilestoneNotVoting";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "NotABacker";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "OnlyOrg";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ReentrancyGuardReentrantCall";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "SafeERC20FailedOperation";
    readonly inputs: readonly [{
        readonly name: "token";
        readonly type: "address";
        readonly internalType: "address";
    }];
}, {
    readonly type: "error";
    readonly name: "VotingNotEnded";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "VotingWindowClosed";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAmount";
    readonly inputs: readonly [];
}];
//# sourceMappingURL=ProjectEscrow.abi.d.ts.map