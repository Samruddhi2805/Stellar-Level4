#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String, Vec
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    PaymentFailed = 2,
    InsufficientBalance = 3,
    Unauthorized = 4,
    ContractNotInitialized = 5,
    InvalidSplit = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PaymentRecord {
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub fee_amount: i128,
    pub cashback_amount: i128,
    pub timestamp: u64,
    pub transaction_id: String,
    pub split_payments: Vec<SplitPayment>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitPayment {
    pub receiver: Address,
    pub amount: i128,
    pub percentage: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RecurringPayment {
    pub id: String,
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub interval: u64, // seconds
    pub next_payment: u64,
    pub active: bool,
    pub total_payments: u32,
    pub max_payments: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SubscriptionTier {
    pub name: String,
    pub price: i128,
    pub duration: u64, // seconds
    pub features: Vec<String>,
}

#[contract]
pub struct PaymentContract;

const TOTAL_VOLUME: Symbol = symbol_short!("VOLUME");
const PAYMENTS: Symbol = symbol_short!("PAYMENTS");
const RECURRING_PAYMENTS: Symbol = symbol_short!("RECUR_PAY");
const SUBSCRIPTION_TIERS: Symbol = symbol_short!("SUB_TIER");
const USER_SUBSCRIPTIONS: Symbol = symbol_short!("USR_SUB");
const ADMIN: Symbol = symbol_short!("ADMIN");
const FEE_CONTRACT: Symbol = symbol_short!("FEE_CON");
const REWARD_CONTRACT: Symbol = symbol_short!("RWD_CON");
const TOKEN_CONTRACT: Symbol = symbol_short!("TOK_CON");
const SPLIT_CONTRACT: Symbol = symbol_short!("SPLIT_CON");

#[contractimpl]
impl PaymentContract {
    pub fn initialize(env: Env, admin: Address, fee_contract: Address, reward_contract: Address, token_contract: Address, split_contract: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&FEE_CONTRACT, &fee_contract);
        env.storage().instance().set(&REWARD_CONTRACT, &reward_contract);
        env.storage().instance().set(&TOKEN_CONTRACT, &token_contract);
        env.storage().instance().set(&SPLIT_CONTRACT, &split_contract);
        
        // Initialize subscription tiers
        let tiers = Vec::new(&env);
        tiers.push_back(SubscriptionTier {
            name: String::from_str(&env, "Basic"),
            price: 10000000, // 0.1 XLM
            duration: 2592000, // 30 days
            features: Vec::new(&env),
        });
        tiers.push_back(SubscriptionTier {
            name: String::from_str(&env, "Premium"),
            price: 50000000, // 0.5 XLM
            duration: 2592000, // 30 days
            features: Vec::new(&env),
        });
        tiers.push_back(SubscriptionTier {
            name: String::from_str(&env, "Enterprise"),
            price: 200000000, // 2 XLM
            duration: 2592000, // 30 days
            features: Vec::new(&env),
        });
        
        env.storage().instance().set(&SUBSCRIPTION_TIERS, &tiers);
    }

    pub fn send_payment(
        env: Env,
        token: Address,
        sender: Address,
        receiver: Address,
        amount: i128,
        transaction_id: String,
    ) -> Result<PaymentRecord, Error> {
        sender.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let fee_contract: Address = env.storage().instance().get(&FEE_CONTRACT).unwrap();
        let reward_contract: Address = env.storage().instance().get(&REWARD_CONTRACT).unwrap();
        let token_contract: Address = env.storage().instance().get(&TOKEN_CONTRACT).unwrap();

        // Calculate fee using fee contract
        let fee_client = crate::FeeContractClient::new(&env, &fee_contract);
        let (fee_amount, _) = fee_client.calculate_fee(&sender, &amount).unwrap_or((0, 0));

        // Calculate cashback using reward contract
        let reward_client = crate::RewardContractClient::new(&env, &reward_contract);
        let cashback_amount = reward_client.calculate_cashback(&amount, &sender.clone()).unwrap_or(0);

        let total_required = amount + fee_amount;

        // Transfer tokens
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sender, &receiver, &amount);

        // Handle fee (transfer to admin or sponsor)
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if fee_amount > 0 {
            // Try to sponsor the fee
            let sponsored = fee_client.sponsor_fee(&admin, &sender.clone(), &fee_amount).unwrap_or(false);
            if !sponsored {
                token_client.transfer(&sender, &admin, &fee_amount);
            }
        }

        // Update volume
        let mut current_volume: i128 = env.storage().instance().get(&TOTAL_VOLUME).unwrap_or(0);
        current_volume += amount;
        env.storage().instance().set(&TOTAL_VOLUME, &current_volume);

        // Record payment
        let record = PaymentRecord {
            sender: sender.clone(),
            receiver: receiver.clone(),
            amount,
            fee_amount,
            cashback_amount,
            timestamp: env.ledger().timestamp(),
            transaction_id: transaction_id.clone(),
            split_payments: Vec::new(&env),
        };

        let mut payments: Vec<PaymentRecord> = env.storage().instance().get(&PAYMENTS).unwrap_or(Vec::new(&env));
        payments.push_back(record.clone());
        env.storage().instance().set(&PAYMENTS, &payments);

        // Record fee payment
        fee_client.record_fee_payment(
            &transaction_id,
            &sender,
            &fee_amount,
            &0, // discount_rate
            &fee_amount,
            &false
        );

        // Distribute cashback if applicable
        if cashback_amount > 0 {
            reward_client.distribute_reward(
                &admin,
                &sender,
                &String::from_str(&env, "cashback"),
                &cashback_amount,
                &transaction_id,
            ).unwrap_or(Ok(())).unwrap_or(());
        }

        // Update user activity streak
        reward_client.update_activity_streak(&sender).unwrap_or(0);

        // Publish events
        env.events().publish((symbol_short!("payment"), sender.clone()), record.clone());

        Ok(record)
    }

    pub fn send_split_payment(
        env: Env,
        token: Address,
        sender: Address,
        splits: Vec<(Address, u32)>, // (receiver, percentage in basis points)
        total_amount: i128,
        transaction_id: String,
    ) -> Result<PaymentRecord, Error> {
        sender.require_auth();

        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let fee_contract: Address = env.storage().instance().get(&FEE_CONTRACT).unwrap();
        let reward_contract: Address = env.storage().instance().get(&REWARD_CONTRACT).unwrap();
        let split_contract: Address = env.storage().instance().get(&SPLIT_CONTRACT).unwrap();

        // Calculate fee using fee contract
        let fee_client = crate::FeeContractClient::new(&env, &fee_contract);
        let (fee_amount, _) = fee_client.calculate_fee(&sender, &total_amount).unwrap_or((0, 0));

        // Calculate cashback using reward contract
        let reward_client = crate::RewardContractClient::new(&env, &reward_contract);
        let cashback_amount = reward_client.calculate_cashback(&total_amount, &sender.clone()).unwrap_or(0);

        // Create split payment using split contract
        let split_client = crate::SplitContractClient::new(&env, &split_contract);
        let split_payment = split_client.create_split_payment(
            &transaction_id.clone(),
            &sender.clone(),
            &(total_amount - fee_amount),
            &splits,
        )?;

        // Execute the split payment
        let executed_split = split_client.execute_split_payment(&token, &transaction_id)?;

        // Handle fee payment
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        let token_client = token::Client::new(&env, &token);
        
        if fee_amount > 0 {
            let sponsored = fee_client.sponsor_fee(&admin, &sender.clone(), &fee_amount).unwrap_or(false);
            if !sponsored {
                token_client.transfer(&sender, &admin, &fee_amount);
            }
        }

        // Record fee payment
        fee_client.record_fee_payment(
            &transaction_id,
            &sender,
            &fee_amount,
            &0, // discount_rate
            &fee_amount,
            &false
        );

        // Distribute cashback if applicable
        if cashback_amount > 0 {
            reward_client.distribute_reward(
                &admin,
                &sender,
                &String::from_str(&env, "cashback"),
                &cashback_amount,
                &transaction_id,
            ).unwrap_or(Ok(())).unwrap_or(());
        }

        // Update user activity streak
        reward_client.update_activity_streak(&sender).unwrap_or(0);

        // Create payment record
        let mut split_payments = Vec::new(&env);
        for recipient in executed_split.recipients.iter() {
            split_payments.push_back(SplitPayment {
                receiver: recipient.address.clone(),
                amount: recipient.amount,
                percentage: recipient.percentage,
            });
        }

        let record = PaymentRecord {
            sender: sender.clone(),
            receiver: Address::generate(&env), // Dummy address for split payments
            amount: total_amount,
            fee_amount,
            cashback_amount,
            timestamp: env.ledger().timestamp(),
            transaction_id: transaction_id.clone(),
            split_payments: split_payments.clone(),
        };

        // Update volume and payments
        let mut current_volume: i128 = env.storage().instance().get(&TOTAL_VOLUME).unwrap_or(0);
        current_volume += total_amount;
        env.storage().instance().set(&TOTAL_VOLUME, &current_volume);

        let mut payments: Vec<PaymentRecord> = env.storage().instance().get(&PAYMENTS).unwrap_or(Vec::new(&env));
        payments.push_back(record.clone());
        env.storage().instance().set(&PAYMENTS, &payments);

        // Publish events
        env.events().publish((symbol_short!("split_payment"), sender.clone()), record.clone());

        Ok(record)
    }

    pub fn create_recurring_payment(
        env: Env,
        sender: Address,
        receiver: Address,
        amount: i128,
        interval: u64,
        max_payments: u32,
    ) -> Result<String, Error> {
        sender.require_auth();

        if amount <= 0 || interval == 0 || max_payments == 0 {
            return Err(Error::InvalidAmount);
        }

        let payment_id = String::from_str(&env, &format!("rec_{}", env.ledger().timestamp()));
        let next_payment = env.ledger().timestamp() + interval;

        let recurring = RecurringPayment {
            id: payment_id.clone(),
            sender: sender.clone(),
            receiver: receiver.clone(),
            amount,
            interval,
            next_payment,
            active: true,
            total_payments: 0,
            max_payments,
        };

        let mut recurring_payments: Vec<RecurringPayment> = env.storage().instance().get(&RECURRING_PAYMENTS).unwrap_or(Vec::new(&env));
        recurring_payments.push_back(recurring);
        env.storage().instance().set(&RECURRING_PAYMENTS, &recurring_payments);

        env.events().publish((symbol_short!("recurring_created"), sender.clone()), payment_id.clone());

        Ok(payment_id)
    }

    pub fn execute_recurring_payment(
        env: Env,
        token: Address,
        payment_id: String,
    ) -> Result<PaymentRecord, Error> {
        let mut recurring_payments: Vec<RecurringPayment> = env.storage().instance().get(&RECURRING_PAYMENTS).unwrap_or(Vec::new(&env));
        let mut target_payment: Option<RecurringPayment> = None;
        let mut target_index = 0;

        for (i, payment) in recurring_payments.iter().enumerate() {
            if payment.id == payment_id {
                target_payment = Some(payment.clone());
                target_index = i;
                break;
            }
        }

        if target_payment.is_none() {
            return Err(Error::InvalidAmount);
        }

        let mut payment = target_payment.unwrap();
        let current_time = env.ledger().timestamp();

        if !payment.active || current_time < payment.next_payment || payment.total_payments >= payment.max_payments {
            return Err(Error::InvalidAmount);
        }

        // Execute the payment
        let transaction_id = String::from_str(&env, &format!("rec_exec_{}", current_time));
        let result = Self::send_payment(env, token, payment.sender.clone(), payment.receiver.clone(), payment.amount, transaction_id.clone());

        match result {
            Ok(record) => {
                // Update recurring payment
                payment.total_payments += 1;
                payment.next_payment = current_time + payment.interval;
                
                if payment.total_payments >= payment.max_payments {
                    payment.active = false;
                }

                recurring_payments[target_index] = payment;
                env.storage().instance().set(&RECURRING_PAYMENTS, &recurring_payments);

                Ok(record)
            }
            Err(e) => Err(e)
        }
    }

    pub fn subscribe(
        env: Env,
        token: Address,
        user: Address,
        tier_name: String,
    ) -> Result<u64, Error> {
        user.require_auth();

        let tiers: Vec<SubscriptionTier> = env.storage().instance().get(&SUBSCRIPTION_TIERS).unwrap_or(Vec::new(&env));
        let mut selected_tier: Option<SubscriptionTier> = None;

        for tier in tiers.iter() {
            if tier.name == tier_name {
                selected_tier = Some(tier.clone());
                break;
            }
        }

        if selected_tier.is_none() {
            return Err(Error::InvalidAmount);
        }

        let tier = selected_tier.unwrap();
        let admin: Address = env.storage().instance().get(&ADMIN).unwrap();

        // Process payment
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&user, &admin, &tier.price);

        // Record subscription
        let subscription_end = env.ledger().timestamp() + tier.duration;
        env.storage().instance().set(&user, &subscription_end);

        env.events().publish((symbol_short!("subscription"), user.clone()), (tier_name, subscription_end));

        Ok(subscription_end)
    }

    pub fn get_volume(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_VOLUME).unwrap_or(0)
    }

    pub fn get_payments(env: Env) -> Vec<PaymentRecord> {
        env.storage().instance().get(&PAYMENTS).unwrap_or(Vec::new(&env))
    }

    pub fn get_user_payments(env: Env, user: Address) -> Vec<PaymentRecord> {
        let all_payments: Vec<PaymentRecord> = env.storage().instance().get(&PAYMENTS).unwrap_or(Vec::new(&env));
        all_payments.into_iter().filter(|p| p.sender == user || p.split_payments.iter().any(|s| s.receiver == user)).collect()
    }

    pub fn get_recurring_payments(env: Env, user: Address) -> Vec<RecurringPayment> {
        let all_recurring: Vec<RecurringPayment> = env.storage().instance().get(&RECURRING_PAYMENTS).unwrap_or(Vec::new(&env));
        all_recurring.into_iter().filter(|r| r.sender == user).collect()
    }

    pub fn get_subscription_tiers(env: Env) -> Vec<SubscriptionTier> {
        env.storage().instance().get(&SUBSCRIPTION_TIERS).unwrap_or(Vec::new(&env))
    }

    pub fn get_user_subscription(env: Env, user: Address) -> Option<u64> {
        env.storage().instance().get(&user)
    }
}

// Client interfaces for inter-contract calls
mod fee_contract {
    soroban_sdk::contractimport!(
        file = "../fee-contract/target/wasm32-unknown-unknown/release/stellar_fee_contract.wasm"
    );
    pub type FeeContractClient = fee_contract::Client;
}

mod reward_contract {
    soroban_sdk::contractimport!(
        file = "../reward-contract/target/wasm32-unknown-unknown/release/stellar_reward_contract.wasm"
    );
    pub type RewardContractClient = reward_contract::Client;
}

mod split_contract {
    soroban_sdk::contractimport!(
        file = "../split-contract/target/wasm32-unknown-unknown/release/stellar_split_contract.wasm"
    );
    pub type SplitContractClient = split_contract::Client;
}

#[cfg(test)]
mod test;
