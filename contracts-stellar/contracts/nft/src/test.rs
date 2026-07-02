use super::*;
use ember_interfaces::nft::PositionNftClient;
use soroban_sdk::testutils::{Address as _, Ledger};
use soroban_sdk::{Address, Env, String};

fn setup_env() -> (Env, Address, Address, Address, PositionNftClient<'static>) {
    let env = Env::default();
    env.ledger().set_timestamp(1000); // Set non-zero timestamp for tests
    let factory = Address::generate(&env);
    let escrow = Address::generate(&env);
    let contract_id = env.register(PositionNft, ());
    let client = PositionNftClient::new(&env, &contract_id);

    client.init(
        &factory,
        &String::from_str(&env, "https://app.ember.example/metadata/"),
    );

    env.mock_all_auths();
    client.init_escrow(&escrow);

    (env, factory, escrow, contract_id, client)
}

#[test]
fn test_init_sets_metadata() {
    let (env, _factory, _, _, client) = setup_env();

    assert_eq!(client.name(), String::from_str(&env, "Ember Position"));
    assert_eq!(client.symbol(), String::from_str(&env, "EPOS"));
}

#[test]
fn test_init_escrow_only_once() {
    let (env, _, escrow, _, client) = setup_env();

    env.mock_all_auths();
    let result = client.try_init_escrow(&escrow);
    assert!(result.is_err());
}

#[test]
fn test_mint_creates_position() {
    let (env, _, _escrow, _, client) = setup_env();
    let user = Address::generate(&env);

    env.mock_all_auths();
    let token_id = client.mint(&user, &1000, &100);

    assert_eq!(token_id, 0);

    let position = client.position_of(&token_id);
    assert_eq!(position.amount, 1000);
    assert_eq!(position.m0_share, 100);
    assert!(position.contributed_at > 0);

    assert_eq!(client.owner_of(&token_id), user);
    assert_eq!(client.balance_of(&user), 1);
}

#[test]
fn test_mint_increments_token_id() {
    let (env, _, _, _, client) = setup_env();
    let user = Address::generate(&env);

    env.mock_all_auths();
    let id0 = client.mint(&user, &100, &10);
    let id1 = client.mint(&user, &200, &20);

    assert_eq!(id0, 0);
    assert_eq!(id1, 1);
}

#[test]
fn test_token_uri_uses_contract_address() {
    let (env, _, _, contract_id, client) = setup_env();
    let user = Address::generate(&env);

    env.mock_all_auths();
    let token_id = client.mint(&user, &100, &10);

    let uri = client.token_uri(&token_id);
    let prefix = String::from_str(&env, "https://app.ember.example/metadata/");

    let prefix_len = prefix.len() as usize;
    let uri_len = uri.len() as usize;

    let mut prefix_buf = [0u8; 128];
    let mut uri_buf = [0u8; 256];

    prefix.copy_into_slice(&mut prefix_buf[..prefix_len]);
    uri.copy_into_slice(&mut uri_buf[..uri_len]);

    // Check URI starts with base_uri prefix
    for i in 0..prefix_len {
        assert_eq!(uri_buf[i], prefix_buf[i]);
    }

    // Check contract address appears in the URI
    let contract_str = contract_id.to_string();
    let contract_len = contract_str.len() as usize;
    let mut contract_buf = [0u8; 64];
    contract_str.copy_into_slice(&mut contract_buf[..contract_len]);

    let mut found = false;
    if uri_len >= contract_len {
        for start in 0..=(uri_len - contract_len) {
            let mut match_all = true;
            for j in 0..contract_len {
                if uri_buf[start + j] != contract_buf[j] {
                    match_all = false;
                    break;
                }
            }
            if match_all {
                found = true;
                break;
            }
        }
    }
    assert!(found, "Contract address should appear in URI");

    // Check URI ends with /0
    assert_eq!(uri_buf[uri_len - 2], b'/');
    assert_eq!(uri_buf[uri_len - 1], b'0');
}

#[test]
fn test_position_of_invalid_token_fails() {
    let (_, _, _, _, client) = setup_env();

    let result = client.try_position_of(&99);
    assert!(result.is_err());
}

#[test]
fn test_owner_of_invalid_token_fails() {
    let (_, _, _, _, client) = setup_env();

    let result = client.try_owner_of(&99);
    assert!(result.is_err());
}

#[test]
fn test_token_uri_invalid_token_fails() {
    let (_, _, _, _, client) = setup_env();

    let result = client.try_token_uri(&99);
    assert!(result.is_err());
}

#[test]
fn test_balance_of_zero_for_non_owner() {
    let (env, _, _, _, client) = setup_env();
    let non_owner = Address::generate(&env);

    assert_eq!(client.balance_of(&non_owner), 0);
}

#[test]
fn test_owner_and_balance_after_mint() {
    let (env, _, _escrow, _, client) = setup_env();
    let user = Address::generate(&env);

    env.mock_all_auths();
    let token_id = client.mint(&user, &1000, &100);

    assert_eq!(client.owner_of(&token_id), user);
    assert_eq!(client.balance_of(&user), 1);
}
