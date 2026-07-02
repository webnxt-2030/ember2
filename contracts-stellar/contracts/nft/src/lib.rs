#![no_std]

use ember_interfaces::nft::{Error, Position, PositionNftInterface};
use soroban_sdk::{
    contract, contractimpl, symbol_short, Address, Env, Map, String, Symbol, Vec,
};

#[contract]
pub struct PositionNft;

#[contractimpl]
impl PositionNftInterface for PositionNft {
    fn init(env: Env, factory: Address, base_uri: String) {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "factory"), &factory);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "base_uri"), &base_uri);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "next_token_id"), &0u32);
        env.storage()
            .instance()
            .set(
                &Symbol::new(&env, "name"),
                &String::from_str(&env, "Ember Position"),
            );
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "symbol"), &String::from_str(&env, "EPOS"));
    }

    fn init_escrow(env: Env, escrow: Address) {
        let factory: Address = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "factory"))
            .unwrap();
        factory.require_auth();

        if env
            .storage()
            .instance()
            .get::<Symbol, Option<Address>>(&Symbol::new(&env, "escrow"))
            .is_some()
        {
            env.panic_with_error(&Error::EscrowAlreadySet);
        }

        env.storage()
            .instance()
            .set(&Symbol::new(&env, "escrow"), &Some(escrow));
    }

    fn mint(env: Env, to: Address, amount: i128, m0_share: i128) -> Result<u32, Error> {
        let escrow: Option<Address> = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "escrow"))
            .unwrap_or(None);
        let escrow = escrow.ok_or(Error::OnlyEscrow)?;
        escrow.require_auth();

        let token_id: u32 = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "next_token_id"))
            .unwrap_or(0u32);

        let next_id = token_id.checked_add(1).unwrap();
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "next_token_id"), &next_id);

        let position = Position {
            amount,
            m0_share,
            contributed_at: env.ledger().timestamp(),
        };

        let mut positions: Map<u32, Position> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "positions"))
            .unwrap_or(Map::new(&env));
        positions.set(token_id, position);
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, "positions"), &positions);

        let mut owners: Map<u32, Address> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "owners"))
            .unwrap_or(Map::new(&env));
        owners.set(token_id, to.clone());
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, "owners"), &owners);

        let mut balances: Map<Address, u32> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "balances"))
            .unwrap_or(Map::new(&env));
        let current_balance = balances.get(to.clone()).unwrap_or(0u32);
        balances.set(to.clone(), current_balance.checked_add(1).unwrap());
        env.storage()
            .persistent()
            .set(&Symbol::new(&env, "balances"), &balances);

        env.events().publish(
            (symbol_short!("mint"), token_id),
            (to, amount, m0_share),
        );

        Ok(token_id)
    }

    fn position_of(env: Env, token_id: u32) -> Result<Position, Error> {
        let positions: Map<u32, Position> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "positions"))
            .unwrap_or(Map::new(&env));
        positions.get(token_id).ok_or(Error::InvalidTokenId)
    }

    fn token_uri(env: Env, token_id: u32) -> Result<String, Error> {
        let owners: Map<u32, Address> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "owners"))
            .unwrap_or(Map::new(&env));
        if !owners.contains_key(token_id) {
            return Err(Error::InvalidTokenId);
        }

        let base_uri: String = env
            .storage()
            .instance()
            .get(&Symbol::new(&env, "base_uri"))
            .unwrap();
        let contract = env.current_contract_address();
        let token_str = Self::u32_to_string(&env, token_id);
        let contract_str = contract.to_string();

        let base_len = base_uri.len() as usize;
        let contract_len = contract_str.len() as usize;
        let token_len = token_str.len() as usize;
        let total = base_len + contract_len + 1 + token_len;

        let mut buf = [0u8; 256];
        let mut offset = 0usize;

        base_uri.copy_into_slice(&mut buf[offset..offset + base_len]);
        offset += base_len;

        contract_str.copy_into_slice(&mut buf[offset..offset + contract_len]);
        offset += contract_len;

        buf[offset] = b'/';
        offset += 1;

        token_str.copy_into_slice(&mut buf[offset..offset + token_len]);

        Ok(String::from_bytes(&env, &buf[..total]))
    }

    fn owner_of(env: Env, token_id: u32) -> Result<Address, Error> {
        let owners: Map<u32, Address> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "owners"))
            .unwrap_or(Map::new(&env));
        owners.get(token_id).ok_or(Error::InvalidTokenId)
    }

    fn balance_of(env: Env, owner: Address) -> u32 {
        let balances: Map<Address, u32> = env
            .storage()
            .persistent()
            .get(&Symbol::new(&env, "balances"))
            .unwrap_or(Map::new(&env));
        balances.get(owner).unwrap_or(0u32)
    }

    fn name(env: Env) -> String {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "name"))
            .unwrap()
    }

    fn symbol(env: Env) -> String {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "symbol"))
            .unwrap()
    }
}

impl PositionNft {
    fn u32_to_string(env: &Env, value: u32) -> String {
        if value == 0 {
            return String::from_str(env, "0");
        }
        let mut n = value;
        let mut chars: Vec<u32> = Vec::new(env);
        while n > 0 {
            chars.push_back(n % 10);
            n /= 10;
        }
        let mut buf = [0u8; 10];
        let mut idx = 0usize;
        for i in (0..chars.len()).rev() {
            let d = chars.get(i).unwrap();
            buf[idx] = b'0' + d as u8;
            idx += 1;
        }
        String::from_bytes(env, &buf[..idx])
    }
}

#[cfg(test)]
mod test;
