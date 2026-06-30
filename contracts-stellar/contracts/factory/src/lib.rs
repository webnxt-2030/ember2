#![no_std]

use ember_interfaces::{
    escrow::ProjectEscrowClient,
    nft::PositionNftClient,
};
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Bytes, BytesN,
    Env, String, Symbol, Vec,
};

pub const MIN_VOTING_PERIOD_SECONDS: u32 = 60 * 60 * 24 * 3; // 3 days
pub const MAX_VOTING_PERIOD_SECONDS: u32 = 60 * 60 * 24 * 30; // 30 days
pub const MILESTONE_BPS_TOTAL: u32 = 10_000;
pub const MIN_MILESTONES: u32 = 2;
pub const MAX_MILESTONES: u32 = 20;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidBps = 1,
    InvalidVotingPeriod = 2,
    ZeroAddress = 3,
    NotInitialized = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ProjectInfo {
    pub project_id: u32,
    pub organization: Address,
    pub creator: Address,
    pub escrow: Address,
    pub nft: Address,
    pub milestone_bps: Vec<u32>,
    pub voting_period: u32,
}

#[contract]
pub struct ProjectFactory;

#[contractimpl]
impl ProjectFactory {
    pub fn init(
        env: Env,
        admin: Address,
        usdc: Address,
        app_base_uri: String,
        escrow_wasm_hash: BytesN<32>,
        nft_wasm_hash: BytesN<32>,
    ) {
        env.storage().instance().set(&Symbol::new(&env, "admin"), &admin);
        env.storage().instance().set(&Symbol::new(&env, "usdc"), &usdc);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "app_base_uri"), &app_base_uri);
        env.storage()
            .instance()
            .set(
                &Symbol::new(&env, "escrow_wasm_hash"),
                &escrow_wasm_hash,
            );
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "nft_wasm_hash"), &nft_wasm_hash);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "project_count"), &0u32);
    }

    pub fn create_project(
        env: Env,
        creator: Address,
        organization: Address,
        milestone_bps: Vec<u32>,
        voting_period: u32,
        _project_uri: String,
    ) -> ProjectInfo {
        creator.require_auth();
        if organization == env.current_contract_address() {
            env.panic_with_error(&Error::ZeroAddress);
        }

        let len = milestone_bps.len();
        if len < MIN_MILESTONES || len > MAX_MILESTONES {
            env.panic_with_error(&Error::InvalidBps);
        }
        let mut sum: u32 = 0;
        for i in 0..len {
            sum = sum.checked_add(milestone_bps.get(i).unwrap()).unwrap();
        }
        if sum != MILESTONE_BPS_TOTAL {
            env.panic_with_error(&Error::InvalidBps);
        }
        if voting_period < MIN_VOTING_PERIOD_SECONDS
            || voting_period > MAX_VOTING_PERIOD_SECONDS
        {
            env.panic_with_error(&Error::InvalidVotingPeriod);
        }

        let project_count: u32 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "project_count"))
            .unwrap();
        let project_id = project_count;
        env.storage()
            .instance()
            .set(
                &Symbol::new(&env, "project_count"),
                &project_count.checked_add(1).unwrap(),
            );

        let escrow_wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "escrow_wasm_hash"))
            .unwrap();
        let nft_wasm_hash: BytesN<32> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "nft_wasm_hash"))
            .unwrap();
        let usdc: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "usdc"))
            .unwrap();
        let app_base_uri: String = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "app_base_uri"))
            .unwrap();

        let salt = Self::project_salt(&env, project_id);

        // Deploy NFT
        let nft_deployer = env.deployer().with_current_contract(salt.clone());
        let nft_addr = nft_deployer.deploy_v2(nft_wasm_hash, ());

        // Deploy escrow with a different salt
        let escrow_salt = Self::project_salt(&env, project_id.checked_add(1_000_000).unwrap());
        let escrow_deployer = env.deployer().with_current_contract(escrow_salt);
        let escrow_addr = escrow_deployer.deploy_v2(escrow_wasm_hash, ());

        // Initialize NFT
        let nft_client = PositionNftClient::new(&env, &nft_addr);
        nft_client.init(&env.current_contract_address(), &app_base_uri);

        // Initialize escrow
        let escrow_client = ProjectEscrowClient::new(&env, &escrow_addr);
        escrow_client.init(
            &usdc,
            &nft_addr,
            &organization,
            &milestone_bps,
            &voting_period,
        );

        // Wire escrow into NFT
        nft_client.init_escrow(&escrow_addr);

        let info = ProjectInfo {
            project_id,
            organization: organization.clone(),
            creator: creator.clone(),
            escrow: escrow_addr.clone(),
            nft: nft_addr.clone(),
            milestone_bps: milestone_bps.clone(),
            voting_period,
        };

        env.events().publish(
            (symbol_short!("created"), project_id),
            (
                organization,
                creator,
                escrow_addr,
                nft_addr,
                milestone_bps,
                voting_period,
            ),
        );

        info
    }

    pub fn project_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "project_count"))
            .unwrap_or(0u32)
    }

    fn project_salt(env: &Env, project_id: u32) -> BytesN<32> {
        let mut bytes = Bytes::new(env);
        bytes.append(&Bytes::from_array(env, &b"ember_project_salt"));
        bytes.append(&Bytes::from_array(env, &project_id.to_be_bytes()));
        env.crypto().sha256(&bytes).into()
    }
}

#[cfg(test)]
mod test;
