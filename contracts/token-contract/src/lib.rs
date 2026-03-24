#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InsufficientBalance = 1,
    Unauthorized = 2,
    InvalidAmount = 3,
    AlreadyClaimed = 4,
    InvalidReferral = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Balance {
    pub amount: i128,
    pub last_claim: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardRecord {
    pub user: Address,
    pub amount: i128,
    pub reward_type: String,
    pub timestamp: u64,
    pub transaction_id: String,
}

#[contract]
pub struct TokenContract;

const BALANCES: Symbol = symbol_short!("BALANCE");
const TOTAL_SUPPLY: Symbol = symbol_short!("SUPPLY");
const REWARDS: Symbol = symbol_short!("REFUNDS");
const ADMIN: Symbol = symbol_short!("ADMIN");
const REFERRAL_CODE: Symbol = symbol_short!("REFCODE");
const REFERRAL_REWARDS: Symbol = symbol_short!("REFRWD");

#[contractimpl]
impl TokenContract {
    pub fn initialize(env: Env, admin: Address, total_supply: i128, token_name: String, token_symbol: String) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&TOTAL_SUPPLY, &total_supply);
        
        let admin_balance = Balance {
            amount: total_supply,
            last_claim: 0,
        };
        env.storage().instance().set(&admin, &admin_balance);
        
        env.events().publish((symbol_short!("init"), admin.clone()), (token_name, token_symbol, total_supply));
    }

    pub fn balance_of(env: Env, user: Address) -> i128 {
        let balance: Balance = env.storage().instance().get(&user).unwrap_or(Balance {
            amount: 0,
            last_claim: 0,
        });
        balance.amount
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut from_balance: Balance = env.storage().instance().get(&from).unwrap_or(Balance {
            amount: 0,
            last_claim: 0,
        });

        if from_balance.amount < amount {
            return Err(Error::InsufficientBalance);
        }

        from_balance.amount -= amount;
        env.storage().instance().set(&from, &from_balance);

        let mut to_balance: Balance = env.storage().instance().get(&to).unwrap_or(Balance {
            amount: 0,
            last_claim: 0,
        });
        to_balance.amount += amount;
        env.storage().instance().set(&to, &to_balance);

        env.events().publish((symbol_short!("transfer"), from.clone()), (to.clone(), amount));
        Ok(())
    }

    pub fn mint_reward(env: Env, admin: Address, user: Address, amount: i128, reward_type: String, transaction_id: String) -> Result<(), Error> {
        let contract_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != contract_admin {
            return Err(Error::Unauthorized);
        }

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut user_balance: Balance = env.storage().instance().get(&user).unwrap_or(Balance {
            amount: 0,
            last_claim: 0,
        });
        user_balance.amount += amount;
        env.storage().instance().set(&user, &user_balance);

        let current_supply: i128 = env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0);
        env.storage().instance().set(&TOTAL_SUPPLY, &(current_supply + amount));

        let reward = RewardRecord {
            user: user.clone(),
            amount,
            reward_type: reward_type.clone(),
            timestamp: env.ledger().timestamp(),
            transaction_id,
        };

        let mut rewards: Vec<RewardRecord> = env.storage().instance().get(&REWARDS).unwrap_or(Vec::new(&env));
        rewards.push_back(reward.clone());
        env.storage().instance().set(&REWARDS, &rewards);

        env.events().publish((symbol_short!("reward"), user.clone()), (amount, reward_type));
        Ok(())
    }

    pub fn create_referral_code(env: Env, user: Address, code: String) -> Result<(), Error> {
        user.require_auth();
        
        if env.storage().instance().has(&REFERRAL_CODE) {
            let existing_codes: Vec<(Address, String)> = env.storage().instance().get(&REFERRAL_CODE).unwrap_or(Vec::new(&env));
            for (addr, _) in existing_codes.iter() {
                if addr == &user {
                    return Err(Error::AlreadyClaimed);
                }
            }
        }

        let mut referral_codes: Vec<(Address, String)> = env.storage().instance().get(&REFERRAL_CODE).unwrap_or(Vec::new(&env));
        referral_codes.push_back((user.clone(), code.clone()));
        env.storage().instance().set(&REFERRAL_CODE, &referral_codes);

        env.events().publish((symbol_short!("referral"), user.clone()), code);
        Ok(())
    }

    pub fn claim_referral_reward(env: Env, referrer: Address, referee: Address, amount: i128) -> Result<(), Error> {
        referee.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let referral_codes: Vec<(Address, String)> = env.storage().instance().get(&REFERRAL_CODE).unwrap_or(Vec::new(&env));
        let mut referrer_found = false;
        
        for (addr, _) in referral_codes.iter() {
            if addr == &referrer {
                referrer_found = true;
                break;
            }
        }

        if !referrer_found {
            return Err(Error::InvalidReferral);
        }

        let mut referrer_balance: Balance = env.storage().instance().get(&referrer).unwrap_or(Balance {
            amount: 0,
            last_claim: 0,
        });
        referrer_balance.amount += amount;
        env.storage().instance().set(&referrer, &referrer_balance);

        let mut referee_balance: Balance = env.storage().instance().get(&referee).unwrap_or(Balance {
            amount: 0,
            last_claim: 0,
        });
        referee_balance.amount += amount / 2; // Referee gets half the reward
        env.storage().instance().set(&referee, &referee_balance);

        let current_supply: i128 = env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0);
        env.storage().instance().set(&TOTAL_SUPPLY, &(current_supply + amount + (amount / 2)));

        env.events().publish((symbol_short!("ref_claim"), referrer.clone()), (referee.clone(), amount));
        Ok(())
    }

    pub fn get_total_supply(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0)
    }

    pub fn get_rewards(env: Env) -> Vec<RewardRecord> {
        env.storage().instance().get(&REWARDS).unwrap_or(Vec::new(&env))
    }

    pub fn get_referral_codes(env: Env) -> Vec<(Address, String)> {
        env.storage().instance().get(&REFERRAL_CODE).unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
