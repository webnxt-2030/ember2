export declare const ProjectFactoryAbi: readonly [{
    readonly type: "constructor";
    readonly inputs: readonly [{
        readonly name: "usdt_";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "admin_";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "appBaseURI_";
        readonly type: "string";
        readonly internalType: "string";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "MAX_VOTING_PERIOD";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "MIN_VOTING_PERIOD";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "admin";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "address";
        readonly internalType: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "appBaseURI";
    readonly inputs: readonly [];
    readonly outputs: readonly [{
        readonly name: "";
        readonly type: "string";
        readonly internalType: "string";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "function";
    readonly name: "createProject";
    readonly inputs: readonly [{
        readonly name: "organizationWallet";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "milestoneBps";
        readonly type: "uint16[]";
        readonly internalType: "uint16[]";
    }, {
        readonly name: "votingPeriod";
        readonly type: "uint32";
        readonly internalType: "uint32";
    }, {
        readonly name: "";
        readonly type: "string";
        readonly internalType: "string";
    }];
    readonly outputs: readonly [{
        readonly name: "projectId";
        readonly type: "uint256";
        readonly internalType: "uint256";
    }, {
        readonly name: "escrowAddr";
        readonly type: "address";
        readonly internalType: "address";
    }, {
        readonly name: "nftAddr";
        readonly type: "address";
        readonly internalType: "address";
    }];
    readonly stateMutability: "nonpayable";
}, {
    readonly type: "function";
    readonly name: "projectCount";
    readonly inputs: readonly [];
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
        readonly internalType: "address";
    }];
    readonly stateMutability: "view";
}, {
    readonly type: "event";
    readonly name: "ProjectCreated";
    readonly inputs: readonly [{
        readonly name: "projectId";
        readonly type: "uint256";
        readonly indexed: true;
        readonly internalType: "uint256";
    }, {
        readonly name: "organization";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "creator";
        readonly type: "address";
        readonly indexed: true;
        readonly internalType: "address";
    }, {
        readonly name: "escrow";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "nft";
        readonly type: "address";
        readonly indexed: false;
        readonly internalType: "address";
    }, {
        readonly name: "milestoneBps";
        readonly type: "uint16[]";
        readonly indexed: false;
        readonly internalType: "uint16[]";
    }, {
        readonly name: "votingPeriod";
        readonly type: "uint32";
        readonly indexed: false;
        readonly internalType: "uint32";
    }];
    readonly anonymous: false;
}, {
    readonly type: "error";
    readonly name: "InvalidBps";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "InvalidVotingPeriod";
    readonly inputs: readonly [];
}, {
    readonly type: "error";
    readonly name: "ZeroAddress";
    readonly inputs: readonly [];
}];
//# sourceMappingURL=ProjectFactory.abi.d.ts.map