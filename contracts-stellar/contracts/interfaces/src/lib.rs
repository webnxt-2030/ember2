#![no_std]

pub mod escrow {
    use soroban_sdk::{
        contractclient, contracterror, contracttype, Address, Env, Map, String, Vec,
    };

    #[contracterror]
    #[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
    #[repr(u32)]
    pub enum Error {
        ZeroAmount = 1,
        InvalidBps = 2,
        OnlyOrg = 3,
        MilestoneNotVoting = 4,
        MilestoneAlreadyVoting = 5,
        MilestoneM0 = 6,
        MilestoneIndexOutOfBounds = 7,
        VotingWindowClosed = 8,
        AlreadyVoted = 9,
        NotABacker = 10,
        VotingNotEnded = 11,
        MilestoneNotPassed = 12,
    }

    #[contracttype]
    #[derive(Copy, Clone, Debug, Eq, PartialEq)]
    pub enum Status {
        Pending = 0,
        AutoReleased = 1,
        Voting = 2,
        Passed = 3,
        Failed = 4,
        Claimed = 5,
    }

    #[contracttype]
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct MilestoneState {
        pub status: Status,
        pub allocated: i128,
        pub vote_start_at: u64,
        pub vote_end_at: u64,
        pub weight_yes: i128,
        pub weight_no: i128,
        pub vote_round: u32,
        pub update_uri: String,
        pub has_voted: Map<(u32, Address), bool>,
    }

    #[contractclient(name = "ProjectEscrowClient")]
    pub trait ProjectEscrowInterface {
        fn init(
            env: Env,
            usdc: Address,
            nft: Address,
            organization: Address,
            milestone_bps: Vec<u32>,
            voting_period: u32,
        );

        fn contribute(env: Env, backer: Address, amount: i128);

        fn submit_milestone(env: Env, milestone_index: u32, update_uri: String);

        fn vote(env: Env, voter: Address, milestone_index: u32, yes: bool);

        fn resolve_milestone(env: Env, milestone_index: u32);

        fn claim_milestone(env: Env, milestone_index: u32);

        fn voting_power_of(env: Env, backer: Address) -> i128;

        fn milestone_allocated(env: Env, index: u32) -> i128;

        fn milestone_status(env: Env, index: u32) -> Status;
    }
}

pub mod nft {
    use soroban_sdk::{
        contractclient, contracterror, contracttype, Address, Env, String,
    };

    #[contracterror]
    #[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
    #[repr(u32)]
    pub enum Error {
        OnlyFactory = 1,
        OnlyEscrow = 2,
        EscrowAlreadySet = 3,
        InvalidTokenId = 4,
    }

    #[contracttype]
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct Position {
        pub amount: i128,
        pub m0_share: i128,
        pub contributed_at: u64,
    }

    #[contractclient(name = "PositionNftClient")]
    pub trait PositionNftInterface {
        fn init(env: Env, factory: Address, base_uri: String);

        fn init_escrow(env: Env, escrow: Address);

        fn mint(env: Env, to: Address, amount: i128, m0_share: i128) -> Result<u32, Error>;

        fn position_of(env: Env, token_id: u32) -> Result<Position, Error>;

        fn token_uri(env: Env, token_id: u32) -> Result<String, Error>;

        fn owner_of(env: Env, token_id: u32) -> Result<Address, Error>;

        fn balance_of(env: Env, owner: Address) -> u32;

        fn name(env: Env) -> String;

        fn symbol(env: Env) -> String;
    }
}
