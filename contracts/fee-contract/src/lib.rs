#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, Env, String, Vec
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    Unauthorized = 1,
    InvalidAmount = 2,
    InsufficientFeeBalance = 3,
    InvalidDiscount = 4,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeTier {
    pub min_amount: i128,
    pub max_amount: i128,
    pub fee_rate: i32, // basis points (100 = 1%)
    pub min_fee: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeDiscount {
    pub user: Address,
    pub discount_rate: i32, // basis points
    pub valid_until: u64,
    pub reason: String,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FeeRecord {
    pub transaction_id: String,
    pub user: Address,
    pub base_fee: i128,
    pub discount_applied: i32,
    pub final_fee: i128,
    pub timestamp: u64,
    pub sponsored: bool,
}

#[contract]
pub struct FeeContract;

const FEE_TIERS: Symbol = symbol_short!("FEETIER");
const FEE_DISCOUNTS: Symbol = symbol_short!("FEE_DSC");
const FEE_RECORDS: Symbol = symbol_short!("FEE_REC");
const ADMIN: Symbol = symbol_short!("ADMIN");
const SPONSOR_BALANCE: Symbol = symbol_short!("SPNS_BAL");

#[contractimpl]
impl FeeContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&SPONSOR_BALANCE, &1000000000i128); // 1000 XLM initial sponsor balance
        
        let default_tiers = Vec::new(&env);
        default_tiers.push_back(FeeTier {
            min_amount: 0,
            max_amount: 10000000, // 0.1 XLM
            fee_rate: 500, // 5%
            min_fee: 1000, // 0.00001 XLM
        });
        default_tiers.push_back(FeeTier {
            min_amount: 10000001,
            max_amount: 100000000, // 1 XLM
            fee_rate: 300, // 3%
            min_fee: 5000, // 0.00005 XLM
        });
        default_tiers.push_back(FeeTier {
            min_amount: 100000001,
            max_amount: 1000000000, // 10 XLM
            fee_rate: 200, // 2%
            min_fee: 30000, // 0.0003 XLM
        });
        default_tiers.push_back(FeeTier {
            min_amount: 1000000001,
            max_amount: 9223372036854775807i128, // max i128
            fee_rate: 100, // 1%
            min_fee: 200000, // 0.002 XLM
        });
        
        env.storage().instance().set(&FEE_TIERS, &default_tiers);
    }

    pub fn calculate_fee(env: Env, user: Address, amount: i128) -> Result<(i128, i32), Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let tiers: Vec<FeeTier> = env.storage().instance().get(&FEE_TIERS).unwrap_or(Vec::new(&env));
        let mut applicable_tier: Option<&FeeTier> = None;

        for tier in tiers.iter() {
            if amount >= tier.min_amount && amount <= tier.max_amount {
                applicable_tier = Some(tier);
                break;
            }
        }

        if applicable_tier.is_none() {
            return Err(Error::InvalidAmount);
        }

        let tier = applicable_tier.unwrap();
        let base_fee = (amount * tier.fee_rate as i128) / 10000;
        let calculated_fee = base_fee.max(tier.min_fee);

        let mut discount_rate = 0;
        if let Some(discount) = Self::get_user_discount(env, user.clone()) {
            if env.ledger().timestamp() <= discount.valid_until {
                discount_rate = discount.discount_rate;
            }
        }

        let final_fee = calculated_fee - (calculated_fee * discount_rate as i128) / 10000;
        
        Ok((final_fee.max(1), discount_rate))
    }

    pub fn sponsor_fee(env: Env, admin: Address, user: Address, amount: i128) -> Result<bool, Error> {
        let contract_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != contract_admin {
            return Err(Error::Unauthorized);
        }

        let sponsor_balance: i128 = env.storage().instance().get(&SPONSOR_BALANCE).unwrap_or(0);
        if sponsor_balance < amount {
            return Ok(false);
        }

        let new_balance = sponsor_balance - amount;
        env.storage().instance().set(&SPONSOR_BALANCE, &new_balance);

        env.events().publish((symbol_short!("sponsor"), user.clone()), amount);
        Ok(true)
    }

    pub fn add_fee_discount(env: Env, admin: Address, user: Address, discount_rate: i32, valid_until: u64, reason: String) -> Result<(), Error> {
        let contract_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != contract_admin {
            return Err(Error::Unauthorized);
        }

        if discount_rate < 0 || discount_rate > 10000 {
            return Err(Error::InvalidDiscount);
        }

        let discount = FeeDiscount {
            user: user.clone(),
            discount_rate,
            valid_until,
            reason: reason.clone(),
        };

        let mut discounts: Vec<FeeDiscount> = env.storage().instance().get(&FEE_DISCOUNTS).unwrap_or(Vec::new(&env));
        
        // Remove existing discount for this user if any
        discounts = discounts.into_iter().filter(|d| d.user != user).collect();
        discounts.push_back(discount);
        
        env.storage().instance().set(&FEE_DISCOUNTS, &discounts);

        env.events().publish((symbol_short!("discount"), user.clone()), (discount_rate, reason));
        Ok(())
    }

    pub fn record_fee_payment(env: Env, transaction_id: String, user: Address, base_fee: i128, discount_applied: i32, final_fee: i128, sponsored: bool) {
        let record = FeeRecord {
            transaction_id: transaction_id.clone(),
            user: user.clone(),
            base_fee,
            discount_applied,
            final_fee,
            timestamp: env.ledger().timestamp(),
            sponsored,
        };

        let mut records: Vec<FeeRecord> = env.storage().instance().get(&FEE_RECORDS).unwrap_or(Vec::new(&env));
        records.push_back(record);
        env.storage().instance().set(&FEE_RECORDS, &records);

        env.events().publish((symbol_short!("fee_record"), user.clone()), (final_fee, sponsored));
    }

    pub fn get_user_discount(env: Env, user: Address) -> Option<FeeDiscount> {
        let discounts: Vec<FeeDiscount> = env.storage().instance().get(&FEE_DISCOUNTS).unwrap_or(Vec::new(&env));
        
        for discount in discounts.iter() {
            if discount.user == user && env.ledger().timestamp() <= discount.valid_until {
                return Some(discount.clone());
            }
        }
        None
    }

    pub fn get_sponsor_balance(env: Env) -> i128 {
        env.storage().instance().get(&SPONSOR_BALANCE).unwrap_or(0)
    }

    pub fn add_sponsor_funds(env: Env, admin: Address, amount: i128) -> Result<(), Error> {
        let contract_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != contract_admin {
            return Err(Error::Unauthorized);
        }

        let current_balance: i128 = env.storage().instance().get(&SPONSOR_BALANCE).unwrap_or(0);
        let new_balance = current_balance + amount;
        env.storage().instance().set(&SPONSOR_BALANCE, &new_balance);

        env.events().publish((symbol_short!("sponsor_add"), admin.clone()), amount);
        Ok(())
    }

    pub fn get_fee_records(env: Env) -> Vec<FeeRecord> {
        env.storage().instance().get(&FEE_RECORDS).unwrap_or(Vec::new(&env))
    }

    pub fn get_fee_tiers(env: Env) -> Vec<FeeTier> {
        env.storage().instance().get(&FEE_TIERS).unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
