#![no_std]

use ember_interfaces::{
    escrow::{Error, MilestoneState, ProjectEscrowInterface, Status},
    nft::PositionNftClient,
};
use soroban_sdk::{
    contract, contractimpl, symbol_short, token, Address, Env, Map, String, Symbol, Vec,
};

pub const MILESTONE_BPS_TOTAL: u32 = 10_000;
pub const MIN_MILESTONES: u32 = 2;
pub const MAX_MILESTONES: u32 = 20;

#[contract]
pub struct ProjectEscrow;

#[contractimpl]
impl ProjectEscrowInterface for ProjectEscrow {
    fn init(
        env: Env,
        usdc: Address,
        nft: Address,
        organization: Address,
        milestone_bps: Vec<u32>,
        voting_period: u32,
    ) {
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

        env.storage().instance().set(&Symbol::new(&env, "usdc"), &usdc);
        env.storage().instance().set(&Symbol::new(&env, "nft"), &nft);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "organization"), &organization);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "milestone_bps"), &milestone_bps);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "voting_period"), &voting_period);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "total_contributed"), &0i128);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "total_contributed_by"), &Map::<Address, i128>::new(&env));

        let mut milestones: Map<u32, MilestoneState> = Map::new(&env);
        for i in 0..len {
            milestones.set(i as u32, MilestoneState {
                status: if i == 0 {
                    Status::AutoReleased
                } else {
                    Status::Pending
                },
                allocated: 0,
                vote_start_at: 0,
                vote_end_at: 0,
                weight_yes: 0,
                weight_no: 0,
                vote_round: 0,
                update_uri: String::from_str(&env, ""),
                has_voted: Map::new(&env),
            });
        }
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "milestones"), &milestones);
    }

    fn contribute(env: Env, backer: Address, amount: i128) {
        if amount <= 0 {
            env.panic_with_error(&Error::ZeroAmount);
        }
        backer.require_auth();

        let usdc: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "usdc"))
            .unwrap();
        let nft: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "nft"))
            .unwrap();
        let organization: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "organization"))
            .unwrap();
        let milestone_bps: Vec<u32> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestone_bps"))
            .unwrap();

        let m0_bps = milestone_bps.get(0).unwrap() as i128;
        let m0_share = amount * m0_bps / (MILESTONE_BPS_TOTAL as i128);

        // Effects
        let total_contributed: i128 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "total_contributed"))
            .unwrap();
        env.storage()
            .instance()
            .set(
                &Symbol::new(&env, "total_contributed"),
                &total_contributed.checked_add(amount).unwrap(),
            );

        let mut total_contributed_by: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "total_contributed_by"))
            .unwrap();
        let backer_total = total_contributed_by.get(backer.clone()).unwrap_or(0);
        total_contributed_by.set(
            backer.clone(),
            backer_total.checked_add(amount).unwrap(),
        );
        env.storage()
            .instance()
            .set(
                &Symbol::new(&env, "total_contributed_by"),
                &total_contributed_by,
            );

        let mut milestones: Map<u32, MilestoneState> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestones"))
            .unwrap();
        let len = milestone_bps.len();
        for i in 1..len {
            let bps = milestone_bps.get(i).unwrap() as i128;
            let share = amount * bps / (MILESTONE_BPS_TOTAL as i128);
            let mut m = milestones.get(i as u32).unwrap();
            m.allocated = m.allocated.checked_add(share).unwrap();
            milestones.set(i as u32, m);
        }
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "milestones"), &milestones);

        // Interactions
        let usdc_client = token::Client::new(&env, &usdc);
        usdc_client.transfer_from(
            &env.current_contract_address(),
            &backer,
            &env.current_contract_address(),
            &amount,
        );
        if m0_share > 0 {
            usdc_client.transfer(
                &env.current_contract_address(),
                &organization,
                &m0_share,
            );
        }

        let nft_client = PositionNftClient::new(&env, &nft);
        let token_id = nft_client.mint(&backer,&amount,&m0_share,
        );

        env.events().publish(
            (symbol_short!("contrib"), backer.clone()),
            (amount, token_id, m0_share),
        );
    }

    fn submit_milestone(env: Env, milestone_index: u32, update_uri: String) {
        let organization: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "organization"))
            .unwrap();
        organization.require_auth();

        if milestone_index == 0 {
            env.panic_with_error(&Error::MilestoneM0);
        }
        let milestone_bps: Vec<u32> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestone_bps"))
            .unwrap();
        if milestone_index >= milestone_bps.len() as u32 {
            env.panic_with_error(&Error::MilestoneIndexOutOfBounds);
        }

        let mut milestones: Map<u32, MilestoneState> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestones"))
            .unwrap();
        let mut m = milestones.get(milestone_index).unwrap();

        match m.status {
            Status::Voting | Status::Passed | Status::Claimed => {
                env.panic_with_error(&Error::MilestoneAlreadyVoting);
            }
            _ => {}
        }

        let voting_period: u32 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "voting_period"))
            .unwrap();
        let start = env.ledger().timestamp();
        let end = start + (voting_period as u64);

        m.status = Status::Voting;
        m.vote_start_at = start;
        m.vote_end_at = end;
        m.update_uri = update_uri.clone();
        m.weight_yes = 0;
        m.weight_no = 0;
        m.vote_round = m.vote_round.checked_add(1).unwrap();
        milestones.set(milestone_index, m);

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "milestones"), &milestones);

        env.events().publish(
            (symbol_short!("submit"), milestone_index),
            (update_uri, end),
        );
    }

    fn vote(env: Env, voter: Address, milestone_index: u32, yes: bool) {
        if milestone_index == 0 {
            env.panic_with_error(&Error::MilestoneM0);
        }
        voter.require_auth();

        let mut milestones: Map<u32, MilestoneState> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestones"))
            .unwrap();
        let mut m = milestones.get(milestone_index).unwrap();

        if m.status != Status::Voting {
            env.panic_with_error(&Error::MilestoneNotVoting);
        }
        if env.ledger().timestamp() >= m.vote_end_at {
            env.panic_with_error(&Error::VotingWindowClosed);
        }

        let total_contributed_by: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "total_contributed_by"))
            .unwrap();
        let weight = total_contributed_by.get(voter.clone()).unwrap_or(0);
        if weight == 0 {
            env.panic_with_error(&Error::NotABacker);
        }

        let vote_key = (m.vote_round, voter.clone());
        if m.has_voted.get(vote_key.clone()).unwrap_or(false) {
            env.panic_with_error(&Error::AlreadyVoted);
        }
        m.has_voted.set(vote_key, true);

        if yes {
            m.weight_yes = m.weight_yes.checked_add(weight).unwrap();
        } else {
            m.weight_no = m.weight_no.checked_add(weight).unwrap();
        }

        milestones.set(milestone_index, m);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "milestones"), &milestones);

        env.events().publish(
            (symbol_short!("voted"), milestone_index, voter.clone()),
            (yes, weight),
        );
    }

    fn resolve_milestone(env: Env, milestone_index: u32) {
        if milestone_index == 0 {
            env.panic_with_error(&Error::MilestoneM0);
        }

        let mut milestones: Map<u32, MilestoneState> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestones"))
            .unwrap();
        let mut m = milestones.get(milestone_index).unwrap();

        if m.status != Status::Voting {
            env.panic_with_error(&Error::MilestoneNotVoting);
        }
        if env.ledger().timestamp() < m.vote_end_at {
            env.panic_with_error(&Error::VotingNotEnded);
        }

        let total_contributed: i128 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "total_contributed"))
            .unwrap();
        let passed = m.weight_no * 2 < total_contributed;
        m.status = if passed { Status::Passed } else { Status::Failed };

        milestones.set(milestone_index, m.clone());
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "milestones"), &milestones);

        env.events().publish(
            (symbol_short!("resolved"), milestone_index),
            (passed, m.weight_yes, m.weight_no),
        );
    }

    fn claim_milestone(env: Env, milestone_index: u32) {
        let organization: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "organization"))
            .unwrap();
        organization.require_auth();

        if milestone_index == 0 {
            env.panic_with_error(&Error::MilestoneM0);
        }
        let milestone_bps: Vec<u32> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestone_bps"))
            .unwrap();
        if milestone_index >= milestone_bps.len() as u32 {
            env.panic_with_error(&Error::MilestoneIndexOutOfBounds);
        }

        let mut milestones: Map<u32, MilestoneState> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestones"))
            .unwrap();
        let mut m = milestones.get(milestone_index).unwrap();

        if m.status != Status::Passed {
            env.panic_with_error(&Error::MilestoneNotPassed);
        }

        let amount = m.allocated;
        m.status = Status::Claimed;
        m.allocated = 0;

        milestones.set(milestone_index, m);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "milestones"), &milestones);

        if amount > 0 {
            let usdc: Address = env
                .storage()
                .instance()
                .get(&Symbol::new(&env, "usdc"))
                .unwrap();
            let usdc_client = token::Client::new(&env, &usdc);
            usdc_client.transfer(
                &env.current_contract_address(),
                &organization,
                &amount,
            );
        }

        env.events().publish(
            (symbol_short!("claimed"), milestone_index),
            amount,
        );
    }

    fn voting_power_of(env: Env, backer: Address) -> i128 {
        let total_contributed_by: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "total_contributed_by"))
            .unwrap();
        total_contributed_by.get(backer).unwrap_or(0)
    }

    fn milestone_allocated(env: Env, index: u32) -> i128 {
        let milestones: Map<u32, MilestoneState> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestones"))
            .unwrap();
        milestones.get(index).unwrap().allocated
    }

    fn milestone_status(env: Env, index: u32) -> Status {
        let milestones: Map<u32, MilestoneState> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "milestones"))
            .unwrap();
        milestones.get(index).unwrap().status
    }
}

#[cfg(test)]
mod test;
