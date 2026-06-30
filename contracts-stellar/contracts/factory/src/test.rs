use super::*;
use soroban_sdk::testutils::Address as _;
use soroban_sdk::{Address, BytesN, Env, String, Vec};

fn setup_env() -> (Env, Address, Address, ProjectFactoryClient<'static>) {
    let env = Env::default();
    let admin = Address::generate(&env);
    let usdc = Address::generate(&env);
    let contract_id = env.register(ProjectFactory, ());
    let client = ProjectFactoryClient::new(&env, &contract_id);

    // In a real test, build the dependent contracts and upload their wasm:
    // let escrow_wasm = env.deployer().upload_contract_wasm(include_bytes!(
    //     "../../target/wasm32-unknown-unknown/release/ember_escrow.wasm"
    // ));
    // let nft_wasm = env.deployer().upload_contract_wasm(include_bytes!(
    //     "../../target/wasm32-unknown-unknown/release/ember_position_nft.wasm"
    // ));
    // For unit tests that do not exercise deployment, arbitrary hashes suffice.
    let escrow_wasm = BytesN::from_array(&env, &[0u8; 32]);
    let nft_wasm = BytesN::from_array(&env, &[1u8; 32]);

    client.init(
        &admin,
        &usdc,
        &String::from_str(&env, "https://app.ember.example/metadata/"),
        &escrow_wasm,
        &nft_wasm,
    );

    (env, admin, usdc, client)
}

#[test]
fn test_init_and_project_count() {
    let (_, _, _, client) = setup_env();
    assert_eq!(client.project_count(), 0);
}

#[test]
#[should_panic]
fn test_create_project_invalid_bps_sum() {
    let (env, admin, _, client) = setup_env();
    let org = Address::generate(&env);
    let bps = Vec::from_array(&env, [3000u32, 3000u32, 3000u32]); // sum = 9000
    client.create_project(
        &admin,
        &org,
        &bps,
        &(7 * 24 * 60 * 60),
        &String::from_str(&env, "ipfs://uri"),
    );
}

#[test]
#[should_panic]
fn test_create_project_too_few_milestones() {
    let (env, admin, _, client) = setup_env();
    let org = Address::generate(&env);
    let bps = Vec::from_array(&env, [10000u32]);
    client.create_project(
        &admin,
        &org,
        &bps,
        &(7 * 24 * 60 * 60),
        &String::from_str(&env, "ipfs://uri"),
    );
}

#[test]
#[should_panic]
fn test_create_project_invalid_voting_period() {
    let (env, admin, _, client) = setup_env();
    let org = Address::generate(&env);
    let bps = Vec::from_array(&env, [2000u32, 3000u32, 5000u32]);
    client.create_project(
        &admin,
        &org,
        &bps,
        &(1 * 24 * 60 * 60), // too short
        &String::from_str(&env, "ipfs://uri"),
    );
}

// Full deployment test requires real escrow and NFT wasm binaries. After
// building the workspace, point `include_bytes!` at the generated .wasm files
// and uncomment the test below.
//
// #[test]
// fn test_create_project_deploys_contracts() {
//     let (env, _, _, client) = setup_env();
//     let org = Address::generate(&env);
//     let bps = Vec::from_array(&env, [2000u32, 3000u32, 5000u32]);
//     env.mock_all_auths();
//     let info = client.create_project(
//         &org,
//         &bps,
//         &(7 * 24 * 60 * 60),
//         &String::from_str(&env, "ipfs://uri"),
//     );
//     assert_eq!(info.project_id, 0);
//     assert_eq!(info.organization, org);
//     assert_eq!(client.project_count(), 1);
// }
