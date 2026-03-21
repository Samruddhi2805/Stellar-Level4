#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, Symbol, Vec
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    PaymentFailed = 2,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRecord {
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub timestamp: u64,
}

#[contract]
pub struct PaymentContract;

const TOTAL_VOLUME: Symbol = symbol_short!("VOLUME");
const PAYMENTS: Symbol = symbol_short!("PAYMENTS");

#[contractimpl]
impl PaymentContract {
    pub fn pay(
        env: Env,
        token: Address,
        sender: Address,
        receiver: Address,
        amount: i128,
    ) -> Result<PaymentRecord, Error> {
        sender.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sender, &receiver, &amount);

        let mut current_volume: i128 = env.storage().instance().get(&TOTAL_VOLUME).unwrap_or(0);
        current_volume += amount;
        env.storage().instance().set(&TOTAL_VOLUME, &current_volume);

        let record = PaymentRecord {
            sender: sender.clone(),
            receiver: receiver.clone(),
            amount,
            timestamp: env.ledger().timestamp(),
        };

        let mut payments: Vec<PaymentRecord> = env.storage().instance().get(&PAYMENTS).unwrap_or(Vec::new(&env));
        payments.push_back(record.clone());
        env.storage().instance().set(&PAYMENTS, &payments);

        env.events()
            .publish((symbol_short!("payment"), sender), record.clone());

        Ok(record)
    }

    pub fn get_volume(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_VOLUME).unwrap_or(0)
    }

    pub fn get_payments(env: Env) -> Vec<PaymentRecord> {
        env.storage().instance().get(&PAYMENTS).unwrap_or(Vec::new(&env))
    }
}

#[cfg(test)]
mod test;
