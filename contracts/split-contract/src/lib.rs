#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env, String, Vec
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InvalidAmount = 1,
    InvalidSplit = 2,
    PaymentFailed = 3,
    Unauthorized = 4,
    ContractNotInitialized = 5,
    TooManyRecipients = 6,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitPayment {
    pub transaction_id: String,
    pub sender: Address,
    pub total_amount: i128,
    pub timestamp: u64,
    pub status: SplitStatus,
    pub recipients: Vec<SplitRecipient>,
    pub fee_amount: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitRecipient {
    pub address: Address,
    pub amount: i128,
    pub percentage: u32, // basis points (10000 = 100%)
    pub transferred: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SplitStatus {
    Pending = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SplitConfig {
    pub max_recipients: u32,
    pub min_percentage_per_recipient: u32, // basis points
    pub fee_percentage: u32, // basis points
    pub enabled: bool,
}

#[contract]
pub struct SplitContract;

const SPLIT_PAYMENTS: Symbol = symbol_short!("SPLIT_PAY");
const SPLIT_CONFIG: Symbol = symbol_short!("SPLIT_CFG");
const ADMIN: Symbol = symbol_short!("ADMIN");
const TOTAL_SPLITS: Symbol = symbol_short!("TOT_SPLITS");
const TOTAL_SPLIT_AMOUNT: Symbol = symbol_short!("TOT_SPLIT_AMT");

#[contractimpl]
impl SplitContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&ADMIN, &admin);
        
        // Set default configuration
        let config = SplitConfig {
            max_recipients: 20,
            min_percentage_per_recipient: 100, // 1%
            fee_percentage: 50, // 0.5%
            enabled: true,
        };
        
        env.storage().instance().set(&SPLIT_CONFIG, &config);
        env.storage().instance().set(&TOTAL_SPLITS, &0u32);
        env.storage().instance().set(&TOTAL_SPLIT_AMOUNT, &0i128);
    }

    pub fn create_split_payment(
        env: Env,
        transaction_id: String,
        sender: Address,
        total_amount: i128,
        recipients: Vec<(Address, u32)>, // (address, percentage in basis points)
    ) -> Result<SplitPayment, Error> {
        sender.require_auth();

        if total_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let config: SplitConfig = env.storage().instance().get(&SPLIT_CONFIG).unwrap();
        if !config.enabled {
            return Err(Error::PaymentFailed);
        }

        if recipients.len() > config.max_recipients as usize {
            return Err(Error::TooManyRecipients);
        }

        // Validate percentages sum to 100%
        let mut total_percentage = 0u32;
        for (_, percentage) in recipients.iter() {
            total_percentage += percentage;
        }
        if total_percentage != 10000 {
            return Err(Error::InvalidSplit);
        }

        // Validate minimum percentage per recipient
        for (_, percentage) in recipients.iter() {
            if *percentage < config.min_percentage_per_recipient {
                return Err(Error::InvalidSplit);
            }
        }

        // Calculate split fee
        let fee_amount = (total_amount * config.fee_percentage as i128) / 10000;
        let distributable_amount = total_amount - fee_amount;

        // Create recipient objects
        let mut split_recipients = Vec::new(&env);
        for (address, percentage) in recipients.iter() {
            let recipient_amount = (distributable_amount * *percentage as i128) / 10000;
            split_recipients.push_back(SplitRecipient {
                address: address.clone(),
                amount: recipient_amount,
                percentage: *percentage,
                transferred: false,
            });
        }

        // Create split payment record
        let split_payment = SplitPayment {
            transaction_id: transaction_id.clone(),
            sender: sender.clone(),
            total_amount,
            timestamp: env.ledger().timestamp(),
            status: SplitStatus::Pending,
            recipients: split_recipients.clone(),
            fee_amount,
        };

        // Store the split payment
        let mut splits: Vec<SplitPayment> = env.storage().instance().get(&SPLIT_PAYMENTS).unwrap_or(Vec::new(&env));
        splits.push_back(split_payment.clone());
        env.storage().instance().set(&SPLIT_PAYMENTS, &splits);

        // Update statistics
        let mut total_splits: u32 = env.storage().instance().get(&TOTAL_SPLITS).unwrap_or(0);
        total_splits += 1;
        env.storage().instance().set(&TOTAL_SPLITS, &total_splits);

        let mut total_split_amount: i128 = env.storage().instance().get(&TOTAL_SPLIT_AMOUNT).unwrap_or(0);
        total_split_amount += total_amount;
        env.storage().instance().set(&TOTAL_SPLIT_AMOUNT, &total_split_amount);

        // Publish event
        env.events().publish((symbol_short!("split_created"), sender.clone()), split_payment.clone());

        Ok(split_payment)
    }

    pub fn execute_split_payment(
        env: Env,
        token: Address,
        transaction_id: String,
    ) -> Result<SplitPayment, Error> {
        let mut splits: Vec<SplitPayment> = env.storage().instance().get(&SPLIT_PAYMENTS).unwrap_or(Vec::new(&env));
        let mut target_split: Option<SplitPayment> = None;
        let mut target_index = 0;

        for (i, split) in splits.iter().enumerate() {
            if split.transaction_id == transaction_id {
                target_split = Some(split.clone());
                target_index = i;
                break;
            }
        }

        if target_split.is_none() {
            return Err(Error::InvalidAmount);
        }

        let mut split = target_split.unwrap();
        if split.status != SplitStatus::Pending {
            return Err(Error::PaymentFailed);
        }

        // Update status to processing
        split.status = SplitStatus::Processing;
        splits[target_index] = split.clone();
        env.storage().instance().set(&SPLIT_PAYMENTS, &splits);

        // Execute transfers
        let token_client = token::Client::new(&env, &token);
        let mut success = true;
        let mut updated_recipients = Vec::new(&env);

        for recipient in split.recipients.iter() {
            if !recipient.transferred {
                match token_client.transfer(&split.sender, &recipient.address, &recipient.amount) {
                    Ok(_) => {
                        updated_recipients.push_back(SplitRecipient {
                            address: recipient.address.clone(),
                            amount: recipient.amount,
                            percentage: recipient.percentage,
                            transferred: true,
                        });
                    }
                    Err(_) => {
                        success = false;
                        updated_recipients.push_back(recipient.clone());
                        break;
                    }
                }
            } else {
                updated_recipients.push_back(recipient.clone());
            }
        }

        // Update split payment status
        split.status = if success { SplitStatus::Completed } else { SplitStatus::Failed };
        split.recipients = updated_recipients.clone();

        splits[target_index] = split.clone();
        env.storage().instance().set(&SPLIT_PAYMENTS, &splits);

        // Publish completion event
        env.events().publish((symbol_short!("split_executed"), split.sender.clone()), (split.status, split.transaction_id.clone()));

        Ok(split)
    }

    pub fn get_split_payment(env: Env, transaction_id: String) -> Option<SplitPayment> {
        let splits: Vec<SplitPayment> = env.storage().instance().get(&SPLIT_PAYMENTS).unwrap_or(Vec::new(&env));
        
        for split in splits.iter() {
            if split.transaction_id == transaction_id {
                return Some(split.clone());
            }
        }
        None
    }

    pub fn get_user_splits(env: Env, user: Address) -> Vec<SplitPayment> {
        let splits: Vec<SplitPayment> = env.storage().instance().get(&SPLIT_PAYMENTS).unwrap_or(Vec::new(&env));
        splits.into_iter().filter(|s| s.sender == user).collect()
    }

    pub fn get_all_splits(env: Env) -> Vec<SplitPayment> {
        env.storage().instance().get(&SPLIT_PAYMENTS).unwrap_or(Vec::new(&env))
    }

    pub fn update_config(
        env: Env,
        admin: Address,
        max_recipients: Option<u32>,
        min_percentage_per_recipient: Option<u32>,
        fee_percentage: Option<u32>,
        enabled: Option<bool>,
    ) -> Result<(), Error> {
        let contract_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != contract_admin {
            return Err(Error::Unauthorized);
        }

        let mut config: SplitConfig = env.storage().instance().get(&SPLIT_CONFIG).unwrap();

        if let Some(max_rec) = max_recipients {
            config.max_recipients = max_rec;
        }
        if let Some(min_pct) = min_percentage_per_recipient {
            config.min_percentage_per_recipient = min_pct;
        }
        if let Some(fee_pct) = fee_percentage {
            config.fee_percentage = fee_pct;
        }
        if let Some(en) = enabled {
            config.enabled = en;
        }

        env.storage().instance().set(&SPLIT_CONFIG, &config);

        env.events().publish((symbol_short!("config_updated"), admin), config.clone());
        Ok(())
    }

    pub fn get_config(env: Env) -> SplitConfig {
        env.storage().instance().get(&SPLIT_CONFIG).unwrap()
    }

    pub fn get_statistics(env: Env) -> (u32, i128) {
        let total_splits: u32 = env.storage().instance().get(&TOTAL_SPLITS).unwrap_or(0);
        let total_amount: i128 = env.storage().instance().get(&TOTAL_SPLIT_AMOUNT).unwrap_or(0);
        (total_splits, total_amount)
    }

    pub fn calculate_split_fee(env: Env, amount: i128) -> i128 {
        let config: SplitConfig = env.storage().instance().get(&SPLIT_CONFIG).unwrap();
        (amount * config.fee_percentage as i128) / 10000
    }

    pub fn validate_split_percentages(env: Env, percentages: Vec<u32>) -> Result<(), Error> {
        let config: SplitConfig = env.storage().instance().get(&SPLIT_CONFIG).unwrap();
        
        let mut total = 0u32;
        for percentage in percentages.iter() {
            if *percentage < config.min_percentage_per_recipient {
                return Err(Error::InvalidSplit);
            }
            total += percentage;
        }

        if total != 10000 {
            return Err(Error::InvalidSplit);
        }

        Ok(())
    }
}

#[cfg(test)]
mod test;
