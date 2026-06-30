use super::*;
use ember_interfaces::{
    escrow::{ProjectEscrowClient, Status},
    nft::PositionNftClient,
};
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{contract, contractimpl, symbol_short, Address, Env, Map, String, Symbol, Vec};

// Minimal mock token implementing the SEP-41 token interface used by the escrow.
#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    pub fn init(env: Env, admin: Address) {
        env.storage().instance().set(&symbol_short!("admin"), &admin);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "initialized"), &true);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin: Address = env.storage().instance().get(&symbol_short!("admin")).unwrap();
        admin.require_auth();

        let mut balances: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&symbol_short!("balances"))
            .unwrap_or(Map::new(&env));
        let current = balances.get(to.clone()).unwrap_or(0);
        balances.set(to, current.checked_add(amount).unwrap());
        env.storage()
            .persistent()
            .set(&symbol_short!("balances"), &balances);
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, _expiration_ledger: u32) {
        from.require_auth();
        let mut allowances: Map<(Address, Address), i128> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "allowances"))
            .unwrap_or(Map::new(&env));
        allowances.set((from, spender), amount);
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, "allowances"), &allowances);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let allowances: Map<(Address, Address), i128> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "allowances"))
            .unwrap_or(Map::new(&env));
        allowances.get((from, spender)).unwrap_or(0)
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        let allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        if allowance < amount {
            panic!("insufficient allowance");
        }
        Self::set_allowance(
            &env,
            from.clone(),
            spender,
            allowance - amount,
        );
        Self::transfer_internal(&env, from, to, amount);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        Self::transfer_internal(&env, from, to, amount);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        let balances: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&symbol_short!("balances"))
            .unwrap_or(Map::new(&env));
        balances.get(id).unwrap_or(0)
    }

    fn transfer_internal(env: &Env, from: Address, to: Address, amount: i128) {
        let mut balances: Map<Address, i128> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "balances"))
            .unwrap_or(Map::new(env));
        let from_balance = balances.get(from.clone()).unwrap_or(0);
        if from_balance < amount {
            panic!("insufficient balance");
        }
        balances.set(from.clone(), from_balance - amount);
        let to_balance = balances.get(to.clone()).unwrap_or(0);
        balances.set(to.clone(), to_balance.checked_add(amount).unwrap());
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, "balances"), &balances);
    }

    fn set_allowance(env: &Env, from: Address, spender: Address, amount: i128) {
        let mut allowances: Map<(Address, Address), i128> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "allowances"))
            .unwrap_or(Map::new(env));
        allowances.set((from, spender), amount);
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, "allowances"), &allowances);
    }
}

fn setup_env() -> (
    Env,
    Address,
    Address,
    Address,
    Address,
    ProjectEscrowClient<'static>,
    PositionNftClient<'static>,
) {
    let env = Env::default();
    let usdc = env.register(MockToken, ());
    let nft = env.register(ember_position_nft::PositionNft, ());
    let organization = Address::generate(&env);
    let escrow = env.register(ProjectEscrow, ());
    let escrow_client = ProjectEscrowClient::new(&env, &escrow);
    let nft_client = PositionNftClient::new(&env, &nft);

    let milestone_bps = Vec::from_array(&env,
        [2000u32, 3000u32, 5000u32]);
    let voting_period = 7 * 24 * 60 * 60; // 7 days

    // Initialize NFT first so escrow can wire to it
    nft_client.init(&escrow,
        &String::from_str(&env, "https://app.ember.example/metadata/"),
    );
    escrow_client.init(
        &usdc,
        &nft,
        &organization,
        &milestone_bps,
        &voting_period,
    );
    env.mock_all_auths();
    nft_client.init_escrow(&escrow);

    (env, usdc, organization, nft, escrow, escrow_client, nft_client)
}

fn mint_usdc(env: &Env, usdc: &Address, to: &Address, amount: i128) {
    let admin = Address::generate(env);
    let client = MockTokenClient::new(env, usdc);
    client.init(&admin);
    env.mock_all_auths();
    client.mint(to, &amount);
}

#[test]
fn test_contribute_mints_nft_and_allocates() {
    let (env, usdc, organization, _nft, escrow, escrow_client, nft_client) = setup_env();
    let backer = Address::generate(&env);

    mint_usdc(&env, &usdc, &backer, 10_000_000);

    // Approve escrow to spend
    let usdc_client = token::Client::new(&env, &usdc);
    env.mock_all_auths();
    usdc_client.approve(
        &backer,
        &escrow,
        &10_000_000i128,
        &(u32::MAX),
    );

    env.mock_all_auths();
    escrow_client.contribute(&backer, &10_000_000i128);

    assert_eq!(escrow_client.voting_power_of(&backer), 10_000_000);

    // 20% to org (m0)
    let org_balance = MockTokenClient::new(&env, &usdc).balance(&organization);
    assert_eq!(org_balance, 2_000_000);

    // 30% to milestone 1
    assert_eq!(escrow_client.milestone_allocated(&1u32), 3_000_000);
    // 50% to milestone 2
    assert_eq!(escrow_client.milestone_allocated(&2u32), 5_000_000);

    // NFT minted
    assert_eq!(nft_client.balance_of(&backer), 1);
    let position = nft_client.position_of(&0u32);
    assert_eq!(position.amount, 10_000_000);
    assert_eq!(position.m0_share, 2_000_000);
}

#[test]
fn test_milestone_lifecycle() {
    let (env, usdc, organization, _nft, escrow, escrow_client, _nft_client) = setup_env();
    let backer = Address::generate(&env);

    mint_usdc(&env, &usdc, &backer, 10_000_000);
    let usdc_client = token::Client::new(&env, &usdc);
    env.mock_all_auths();
    usdc_client.approve(
        &backer,
        &escrow,
        &10_000_000i128,
        &(u32::MAX),
    );
    env.mock_all_auths();
    escrow_client.contribute(&backer, &10_000_000i128);

    // Submit milestone 1
    env.mock_all_auths();
    escrow_client.submit_milestone(
        &1u32,
        &String::from_str(&env, "ipfs://update-1"),
    );
    assert_eq!(
        escrow_client.milestone_status(&1u32),
        Status::Voting
    );

    // Vote yes
    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &true);

    // Advance time past voting period
    env.ledger().set_timestamp(
        env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1,
    );

    escrow_client.resolve_milestone(&1u32);
    assert_eq!(
        escrow_client.milestone_status(&1u32),
        Status::Passed
    );

    // Claim
    let org_balance_before = MockTokenClient::new(&env, &usdc).balance(&organization);
    env.mock_all_auths();
    escrow_client.claim_milestone(&1u32);
    let org_balance_after = MockTokenClient::new(&env, &usdc).balance(&organization);
    assert_eq!(
        org_balance_after - org_balance_before,
        3_000_000
    );
    assert_eq!(escrow_client.milestone_allocated(&1u32), 0);
}

#[test]
fn test_vote_fails_after_window() {
    let (env, usdc, _, _, escrow, escrow_client, _) = setup_env();
    let backer = Address::generate(&env);

    mint_usdc(&env, &usdc, &backer, 10_000_000);
    let usdc_client = token::Client::new(&env, &usdc);
    env.mock_all_auths();
    usdc_client.approve(
        &backer,
        &escrow,
        &10_000_000i128,
        &(u32::MAX),
    );
    env.mock_all_auths();
    escrow_client.contribute(&backer, &10_000_000i128);

    env.mock_all_auths();
    escrow_client.submit_milestone(
        &1u32,
        &String::from_str(&env, "ipfs://update-1"),
    );

    env.ledger().set_timestamp(
        env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1,
    );

    let result = escrow_client.try_vote(&backer, &1u32, &true);
    assert!(result.is_err());
}

#[test]
#[should_panic]
fn test_double_vote_fails() {
    let (env, usdc, _, _, escrow, escrow_client, _) = setup_env();
    let backer = Address::generate(&env);

    mint_usdc(&env, &usdc, &backer, 10_000_000);
    let usdc_client = token::Client::new(&env, &usdc);
    env.mock_all_auths();
    usdc_client.approve(
        &backer, &escrow, &10_000_000i128, &(u32::MAX));
    env.mock_all_auths();
    escrow_client.contribute(&backer, &10_000_000i128);

    env.mock_all_auths();
    escrow_client.submit_milestone(
        &1u32, &String::from_str(&env, "ipfs://update-1"));

    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &true);

    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &true);
}

#[test]
#[should_panic]
fn test_claim_before_passed_fails() {
    let (env, usdc, _, _, escrow, escrow_client, _) = setup_env();
    let backer = Address::generate(&env);

    mint_usdc(&env, &usdc, &backer, 10_000_000);
    let usdc_client = token::Client::new(&env, &usdc);
    env.mock_all_auths();
    usdc_client.approve(
        &backer, &escrow, &10_000_000i128, &(u32::MAX));
    env.mock_all_auths();
    escrow_client.contribute(&backer, &10_000_000i128);

    env.mock_all_auths();
    escrow_client.submit_milestone(
        &1u32, &String::from_str(&env, "ipfs://update-1"));

    env.mock_all_auths();
    escrow_client.claim_milestone(&1u32);
}

#[test]
fn test_failed_milestone_can_be_resubmitted() {
    let (env, usdc, _, _, escrow, escrow_client, _) = setup_env();
    let backer = Address::generate(&env);

    mint_usdc(&env, &usdc, &backer, 10_000_000);
    let usdc_client = token::Client::new(&env, &usdc);
    env.mock_all_auths();
    usdc_client.approve(
        &backer, &escrow, &10_000_000i128, &(u32::MAX));
    env.mock_all_auths();
    escrow_client.contribute(&backer, &10_000_000i128);

    env.mock_all_auths();
    escrow_client.submit_milestone(
        &1u32, &String::from_str(&env, "ipfs://update-1"));
    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &false);

    env.ledger().set_timestamp(env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1);
    escrow_client.resolve_milestone(&1u32);
    assert_eq!(escrow_client.milestone_status(&1u32), Status::Failed);

    env.mock_all_auths();
    escrow_client.submit_milestone(
        &1u32, &String::from_str(&env, "ipfs://update-2"));
    assert_eq!(escrow_client.milestone_status(&1u32), Status::Voting);

    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &true);

    env.ledger().set_timestamp(env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1);
    escrow_client.resolve_milestone(&1u32);
    assert_eq!(escrow_client.milestone_status(&1u32), Status::Passed);

    env.mock_all_auths();
    escrow_client.claim_milestone(&1u32);
    assert_eq!(escrow_client.milestone_status(&1u32), Status::Claimed);
}

// ═════════════════════════════════════════════════════════════════════════════
//  Fuzz-style property tests (deterministic seeds, no Foundry fuzzer)
// ═════════════════════════════════════════════════════════════════════════════

fn setup_env_with_bps(
    env: &Env,
    milestone_bps: &[u32],
) -> (
    Address,
    Address,
    Address,
    ProjectEscrowClient<'static>,
    PositionNftClient<'static>,
) {
    let usdc = env.register(MockToken, ());
    let nft = env.register(ember_position_nft::PositionNft, ());
    let organization = Address::generate(env);
    let escrow = env.register(ProjectEscrow, ());
    let escrow_client = ProjectEscrowClient::new(env, &escrow);
    let nft_client = PositionNftClient::new(env, &nft);

    let bps = Vec::from_slice(env, milestone_bps);
    let voting_period = 7 * 24 * 60 * 60;

    nft_client.init(
        &escrow,
        &String::from_str(env, "https://app.ember.example/metadata/"),
    );
    escrow_client.init(&usdc, &nft, &organization, &bps, &voting_period);
    env.mock_all_auths();
    nft_client.init_escrow(&escrow);

    (usdc, organization, escrow, escrow_client, nft_client)
}

fn next_seed(seed: u64) -> u64 {
    seed.wrapping_mul(6364136223846793005)
        .wrapping_add(1442695040888963407)
}

fn random_amount(seed: u64, min: i128, max: i128) -> (i128, u64) {
    let next = next_seed(seed);
    let range = max - min;
    let offset = ((next as u128) % (range as u128)) as i128;
    (min + offset, next)
}

fn approve_and_contribute(
    env: &Env,
    usdc: &Address,
    escrow: &Address,
    escrow_client: &ProjectEscrowClient<'static>,
    backer: &Address,
    amount: i128,
) {
    mint_usdc(env, usdc, backer, amount);
    let usdc_client = token::Client::new(env, usdc);
    env.mock_all_auths();
    usdc_client.approve(backer, escrow, &amount, &(u32::MAX));
    env.mock_all_auths();
    escrow_client.contribute(backer, &amount);
}

#[test]
fn test_fuzz_contribute_invariant_holds() {
    let env = Env::default();
    let (usdc, organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let mut seed = 12345u64;
    let mut total_contributed: i128 = 0;
    for _ in 0..20 {
        let (amount, next) = random_amount(seed, 1_000_000, 1_000_000_000);
        seed = next;
        let backer = Address::generate(&env);
        approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, amount);
        total_contributed += amount;

        let m0_released = MockTokenClient::new(&env, &usdc).balance(&organization);
        let mut alloc_sum: i128 = 0;
        for i in 1u32..4u32 {
            alloc_sum += escrow_client.milestone_allocated(&i);
        }

        assert!(alloc_sum + m0_released <= total_contributed, "allocSum + m0Released exceeds total");
        assert!(
            total_contributed - (alloc_sum + m0_released) <= 4i128,
            "dust exceeds milestone count"
        );
    }
}

#[test]
fn test_fuzz_multiple_contributions_invariant_holds() {
    let env = Env::default();
    let (usdc, organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let mut seed = 67890u64;
    let mut total_contributed: i128 = 0;
    for _ in 0..5 {
        let (amount, next) = random_amount(seed, 1_000_000, 100_000_000);
        seed = next;
        let backer = Address::generate(&env);
        approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, amount);
        total_contributed += amount;
    }

    let m0_released = MockTokenClient::new(&env, &usdc).balance(&organization);
    let mut alloc_sum: i128 = 0;
    for i in 1u32..4u32 {
        alloc_sum += escrow_client.milestone_allocated(&i);
    }

    assert!(alloc_sum + m0_released <= total_contributed, "cumulative invariant violated");
    assert!(
        total_contributed - (alloc_sum + m0_released) <= 5 * 4i128,
        "cumulative dust unbounded"
    );
}

#[test]
fn test_fuzz_random_bps_invariant_holds() {
    let env = Env::default();

    // Deterministic "random" valid 4-milestone bps summing to 10000.
    let seeds: [(u32, u32, u32); 10] = [
        (500, 1500, 3000),
        (1000, 2000, 3000),
        (2500, 2500, 2500),
        (0, 3333, 3333),
        (100, 4000, 4000),
        (2000, 1000, 2000),
        (3000, 3000, 3000),
        (50, 50, 9900),
        (1234, 2345, 3456),
        (4000, 3000, 2000),
    ];

    for (b0, b1, b2) in seeds.iter() {
        let bps = [*b0, *b1, *b2, 10_000u32 - (b0 + b1 + b2)];
        let (usdc, organization, escrow, escrow_client, _nft) =
            setup_env_with_bps(&env, &bps);

        let backer = Address::generate(&env);
        let amount: i128 = 10_000_000;
        approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, amount);

        let m0_released = MockTokenClient::new(&env, &usdc).balance(&organization);
        let mut alloc_sum: i128 = 0;
        for i in 1u32..4u32 {
            alloc_sum += escrow_client.milestone_allocated(&i);
        }
        let total = escrow_client.voting_power_of(&backer);

        assert!(alloc_sum + m0_released <= total, "random bps invariant violated");
        assert!(total - (alloc_sum + m0_released) <= 4i128, "dust unbounded");
    }
}

#[test]
fn test_fuzz_zero_m0_bps_invariant_holds() {
    let env = Env::default();
    let (usdc, organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[0u32, 3334u32, 3333u32, 3333u32]);

    let mut seed = 11111u64;
    let mut total_contributed: i128 = 0;
    for _ in 0..10 {
        let (amount, next) = random_amount(seed, 1_000_000, 100_000_000);
        seed = next;
        let backer = Address::generate(&env);
        approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, amount);
        total_contributed += amount;

        assert_eq!(
            MockTokenClient::new(&env, &usdc).balance(&organization),
            0,
            "org should receive 0 when m0 bps == 0"
        );

        let mut alloc_sum: i128 = 0;
        for i in 1u32..4u32 {
            alloc_sum += escrow_client.milestone_allocated(&i);
        }
        assert!(alloc_sum <= total_contributed, "zero-m0 invariant violated");
    }
}

// ═════════════════════════════════════════════════════════════════════════════
//  Invariant-style tests
// ═════════════════════════════════════════════════════════════════════════════

#[test]
fn test_invariant_total_accounting_holds() {
    let env = Env::default();
    let (usdc, organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    let amount: i128 = 10_000_000;
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, amount);

    let m0_released = MockTokenClient::new(&env, &usdc).balance(&organization);

    // Submit, pass, and claim milestone 1
    env.mock_all_auths();
    escrow_client.submit_milestone(&1u32, &String::from_str(&env, "ipfs://update-1"));
    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &true);
    env.ledger().set_timestamp(env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1);
    escrow_client.resolve_milestone(&1u32);

    let claimed_before = escrow_client.milestone_allocated(&1u32);
    env.mock_all_auths();
    escrow_client.claim_milestone(&1u32);

    let mut alloc_sum: i128 = 0;
    for i in 1u32..4u32 {
        alloc_sum += escrow_client.milestone_allocated(&i);
    }
    let total = escrow_client.voting_power_of(&backer);
    let accounted_for = alloc_sum + m0_released + claimed_before;

    assert!(accounted_for <= total, "total accounting invariant violated");
}

#[test]
fn test_invariant_m0_always_auto_released() {
    let env = Env::default();
    let (_usdc, _organization, _escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    assert_eq!(
        escrow_client.milestone_status(&0u32),
        Status::AutoReleased,
        "m0 must always be AUTO_RELEASED"
    );
    assert_eq!(
        escrow_client.milestone_allocated(&0u32),
        0i128,
        "m0 allocated must always be 0"
    );
}

#[test]
fn test_invariant_escrow_balance_covers_allocations() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    let mut alloc_sum: i128 = 0;
    for i in 1u32..4u32 {
        alloc_sum += escrow_client.milestone_allocated(&i);
    }
    let escrow_balance = MockTokenClient::new(&env, &usdc).balance(&escrow);

    assert!(escrow_balance >= alloc_sum, "escrow balance must cover allocations");
}

// ═════════════════════════════════════════════════════════════════════════════
//  Coverage tests for error branches
// ═════════════════════════════════════════════════════════════════════════════

#[test]
#[should_panic]
fn test_init_reverts_if_bps_too_short() {
    let env = Env::default();
    setup_env_with_bps(&env, &[10_000u32]);
}

#[test]
#[should_panic]
fn test_init_reverts_if_bps_too_long() {
    let env = Env::default();
    let bps: [u32; 21] = core::array::from_fn(|_| 476);
    setup_env_with_bps(&env, &bps);
}

#[test]
#[should_panic]
fn test_init_reverts_if_bps_sum_invalid() {
    let env = Env::default();
    setup_env_with_bps(&env, &[3000u32, 3000u32, 3000u32]);
}

#[test]
fn test_contribute_zero_m0_share_no_transfer_to_org() {
    let env = Env::default();
    let (usdc, organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[0u32, 5000u32, 5000u32]);

    let backer = Address::generate(&env);
    let amount: i128 = 1_000_000;
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, amount);

    assert_eq!(
        MockTokenClient::new(&env, &usdc).balance(&organization),
        0,
        "org should receive 0 when m0 bps == 0"
    );
    assert_eq!(
        MockTokenClient::new(&env, &usdc).balance(&escrow),
        amount,
        "all funds should stay in escrow"
    );
}

#[test]
#[should_panic]
fn test_submit_milestone_reverts_if_index_zero() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    env.mock_all_auths();
    escrow_client.submit_milestone(&0u32, &String::from_str(&env, "ipfs://update-0"));
}

#[test]
#[should_panic]
fn test_submit_milestone_reverts_if_out_of_bounds() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    env.mock_all_auths();
    escrow_client.submit_milestone(&4u32, &String::from_str(&env, "ipfs://update-4"));
}

#[test]
#[should_panic]
fn test_submit_milestone_reverts_if_already_voting() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    env.mock_all_auths();
    escrow_client.submit_milestone(&1u32, &String::from_str(&env, "ipfs://update-1"));

    env.mock_all_auths();
    escrow_client.submit_milestone(&1u32, &String::from_str(&env, "ipfs://update-1-again"));
}

#[test]
#[should_panic]
fn test_submit_milestone_reverts_if_passed() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    env.mock_all_auths();
    escrow_client.submit_milestone(&1u32, &String::from_str(&env, "ipfs://update-1"));
    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &true);
    env.ledger().set_timestamp(env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1);
    escrow_client.resolve_milestone(&1u32);

    env.mock_all_auths();
    escrow_client.submit_milestone(&1u32, &String::from_str(&env, "ipfs://update-1-again"));
}

#[test]
#[should_panic]
fn test_submit_milestone_reverts_if_claimed() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    env.mock_all_auths();
    escrow_client.submit_milestone(&1u32, &String::from_str(&env, "ipfs://update-1"));
    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &true);
    env.ledger().set_timestamp(env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1);
    escrow_client.resolve_milestone(&1u32);
    env.mock_all_auths();
    escrow_client.claim_milestone(&1u32);

    env.mock_all_auths();
    escrow_client.submit_milestone(&1u32, &String::from_str(&env, "ipfs://update-1-again"));
}

#[test]
#[should_panic]
fn test_vote_reverts_if_index_zero() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    env.mock_all_auths();
    escrow_client.vote(&backer, &0u32, &true);
}

#[test]
fn test_vote_no_updates_weight_no() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    env.mock_all_auths();
    escrow_client.submit_milestone(&1u32, &String::from_str(&env, "ipfs://update-1"));
    env.mock_all_auths();
    escrow_client.vote(&backer, &1u32, &false);

    env.ledger().set_timestamp(env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1);
    escrow_client.resolve_milestone(&1u32);
    assert_eq!(escrow_client.milestone_status(&1u32), Status::Failed);
}

#[test]
#[should_panic]
fn test_resolve_milestone_reverts_if_index_zero() {
    let env = Env::default();
    let (_usdc, _organization, _escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    escrow_client.resolve_milestone(&0u32);
}

#[test]
#[should_panic]
fn test_resolve_milestone_reverts_if_not_voting() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 10_000_000);

    env.ledger().set_timestamp(env.ledger().timestamp() + 8 * 24 * 60 * 60 + 1);
    escrow_client.resolve_milestone(&1u32);
}

#[test]
#[should_panic]
fn test_claim_milestone_reverts_if_index_zero() {
    let env = Env::default();
    let (_usdc, _organization, _escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    env.mock_all_auths();
    escrow_client.claim_milestone(&0u32);
}

#[test]
#[should_panic]
fn test_claim_milestone_reverts_if_out_of_bounds() {
    let env = Env::default();
    let (_usdc, _organization, _escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    env.mock_all_auths();
    escrow_client.claim_milestone(&10u32);
}

#[test]
fn test_voting_power_of_zero_for_non_backer() {
    let env = Env::default();
    let (_usdc, _organization, _escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let stranger = Address::generate(&env);
    assert_eq!(escrow_client.voting_power_of(&stranger), 0);
}

#[test]
fn test_voting_power_of_returns_contribution_amount() {
    let env = Env::default();
    let (usdc, _organization, escrow, escrow_client, _nft) =
        setup_env_with_bps(&env, &[2500u32, 2500u32, 2500u32, 2500u32]);

    let backer = Address::generate(&env);
    approve_and_contribute(&env, &usdc, &escrow, &escrow_client, &backer, 5_000_000);
    assert_eq!(escrow_client.voting_power_of(&backer), 5_000_000);
}
