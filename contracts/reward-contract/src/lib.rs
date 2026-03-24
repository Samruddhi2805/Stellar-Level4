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
    AlreadyClaimed = 3,
    InsufficientRewards = 4,
    InvalidPeriod = 5,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RewardRule {
    pub reward_type: String,
    pub condition: String,
    pub reward_amount: i128,
    pub max_claims: u32,
    pub current_claims: u32,
    pub active: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct UserReward {
    pub user: Address,
    pub reward_type: String,
    pub amount: i128,
    pub transaction_id: String,
    pub timestamp: u64,
    pub claimed: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ActivityStreak {
    pub user: Address,
    pub current_streak: u32,
    pub longest_streak: u32,
    pub last_activity: u64,
    pub total_activities: u32,
}

#[contract]
pub struct RewardContract;

const REWARD_RULES: Symbol = symbol_short!("RWD_RUL");
const USER_REWARDS: Symbol = symbol_short!("USR_RWD");
const ACTIVITY_STREAKS: Symbol = symbol_short!("ACT_STR");
const ADMIN: Symbol = symbol_short!("ADMIN");
const REWARD_POOL: Symbol = symbol_short!("RWD_POOL");

#[contractimpl]
impl RewardContract {
    pub fn initialize(env: Env, admin: Address, initial_pool: i128) {
        if env.storage().instance().has(&ADMIN) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&REWARD_POOL, &initial_pool);
        
        // Initialize default reward rules
        let default_rules = Vec::new(&env);
        
        // Cashback rule: 1% of transaction amount
        default_rules.push_back(RewardRule {
            reward_type: String::from_str(&env, "cashback"),
            condition: String::from_str(&env, "transaction"),
            reward_amount: 100, // 1% in basis points
            max_claims: 1000000,
            current_claims: 0,
            active: true,
        });
        
        // Daily activity bonus
        default_rules.push_back(RewardRule {
            reward_type: String::from_str(&env, "daily_activity"),
            condition: String::from_str(&env, "daily"),
            reward_amount: 1000, // Fixed amount
            max_claims: 365,
            current_claims: 0,
            active: true,
        });
        
        // Streak bonus: 7-day streak
        default_rules.push_back(RewardRule {
            reward_type: String::from_str(&env, "streak_bonus"),
            condition: String::from_str(&env, "streak_7"),
            reward_amount: 5000,
            max_claims: 52,
            current_claims: 0,
            active: true,
        });
        
        env.storage().instance().set(&REWARD_RULES, &default_rules);
    }

    pub fn calculate_cashback(env: Env, transaction_amount: i128, user: Address) -> Result<i128, Error> {
        if transaction_amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let rules: Vec<RewardRule> = env.storage().instance().get(&REWARD_RULES).unwrap_or(Vec::new(&env));
        
        for rule in rules.iter() {
            if rule.reward_type.to_string() == "cashback" && rule.active {
                let cashback = (transaction_amount * rule.reward_amount) / 10000;
                return Ok(cashback);
            }
        }
        
        Ok(0)
    }

    pub fn distribute_reward(env: Env, admin: Address, user: Address, reward_type: String, amount: i128, transaction_id: String) -> Result<(), Error> {
        let contract_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != contract_admin {
            return Err(Error::Unauthorized);
        }

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let pool_balance: i128 = env.storage().instance().get(&REWARD_POOL).unwrap_or(0);
        if pool_balance < amount {
            return Err(Error::InsufficientRewards);
        }

        // Update pool balance
        env.storage().instance().set(&REWARD_POOL, &(pool_balance - amount));

        // Record user reward
        let reward = UserReward {
            user: user.clone(),
            reward_type: reward_type.clone(),
            amount,
            transaction_id: transaction_id.clone(),
            timestamp: env.ledger().timestamp(),
            claimed: false,
        };

        let mut user_rewards: Vec<UserReward> = env.storage().instance().get(&USER_REWARDS).unwrap_or(Vec::new(&env));
        user_rewards.push_back(reward.clone());
        env.storage().instance().set(&USER_REWARDS, &user_rewards);

        // Update rule claim count
        let mut rules: Vec<RewardRule> = env.storage().instance().get(&REWARD_RULES).unwrap_or(Vec::new(&env));
        for mut rule in rules.iter_mut() {
            if rule.reward_type == reward_type {
                rule.current_claims += 1;
                break;
            }
        }
        env.storage().instance().set(&REWARD_RULES, &rules);

        env.events().publish((symbol_short!("reward"), user.clone()), (reward_type, amount, transaction_id));
        Ok(())
    }

    pub fn update_activity_streak(env: Env, user: Address) -> Result<u32, Error> {
        let current_time = env.ledger().timestamp();
        let day_in_seconds = 86400u64;

        let mut streak: ActivityStreak = env.storage().instance().get(&user).unwrap_or(ActivityStreak {
            user: user.clone(),
            current_streak: 0,
            longest_streak: 0,
            last_activity: 0,
            total_activities: 0,
        });

        // Check if this is a consecutive day
        if current_time - streak.last_activity <= day_in_seconds * 2 {
            streak.current_streak += 1;
        } else {
            streak.current_streak = 1;
        }

        streak.last_activity = current_time;
        streak.total_activities += 1;

        if streak.current_streak > streak.longest_streak {
            streak.longest_streak = streak.current_streak;
        }

        env.storage().instance().set(&user, &streak);

        // Check for streak bonuses
        if streak.current_streak == 7 {
            let rules: Vec<RewardRule> = env.storage().instance().get(&REWARD_RULES).unwrap_or(Vec::new(&env));
            for rule in rules.iter() {
                if rule.reward_type.to_string() == "streak_bonus" && rule.active && rule.current_claims < rule.max_claims {
                    // Trigger streak bonus
                    env.events().publish((symbol_short!("streak_bonus"), user.clone()), streak.current_streak);
                    break;
                }
            }
        }

        env.events().publish((symbol_short!("activity"), user.clone()), streak.current_streak);
        Ok(streak.current_streak)
    }

    pub fn claim_daily_bonus(env: Env, user: Address) -> Result<i128, Error> {
        user.require_auth();

        let current_time = env.ledger().timestamp();
        let day_in_seconds = 86400u64;

        // Check if user has already claimed today
        let user_rewards: Vec<UserReward> = env.storage().instance().get(&USER_REWARDS).unwrap_or(Vec::new(&env));
        for reward in user_rewards.iter() {
            if reward.user == user && reward.reward_type.to_string() == "daily_activity" {
                if current_time - reward.timestamp < day_in_seconds {
                    return Err(Error::AlreadyClaimed);
                }
            }
        }

        let rules: Vec<RewardRule> = env.storage().instance().get(&REWARD_RULES).unwrap_or(Vec::new(&env));
        for rule in rules.iter() {
            if rule.reward_type.to_string() == "daily_activity" && rule.active {
                return Ok(rule.reward_amount);
            }
        }

        Ok(0)
    }

    pub fn get_user_rewards(env: Env, user: Address) -> Vec<UserReward> {
        let all_rewards: Vec<UserReward> = env.storage().instance().get(&USER_REWARDS).unwrap_or(Vec::new(&env));
        all_rewards.into_iter().filter(|r| r.user == user).collect()
    }

    pub fn get_user_streak(env: Env, user: Address) -> ActivityStreak {
        env.storage().instance().get(&user).unwrap_or(ActivityStreak {
            user,
            current_streak: 0,
            longest_streak: 0,
            last_activity: 0,
            total_activities: 0,
        })
    }

    pub fn get_reward_pool(env: Env) -> i128 {
        env.storage().instance().get(&REWARD_POOL).unwrap_or(0)
    }

    pub fn add_to_reward_pool(env: Env, admin: Address, amount: i128) -> Result<(), Error> {
        let contract_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != contract_admin {
            return Err(Error::Unauthorized);
        }

        let current_pool: i128 = env.storage().instance().get(&REWARD_POOL).unwrap_or(0);
        let new_pool = current_pool + amount;
        env.storage().instance().set(&REWARD_POOL, &new_pool);

        env.events().publish((symbol_short!("pool_add"), admin.clone()), amount);
        Ok(())
    }

    pub fn get_reward_rules(env: Env) -> Vec<RewardRule> {
        env.storage().instance().get(&REWARD_RULES).unwrap_or(Vec::new(&env))
    }

    pub fn update_reward_rule(env: Env, admin: Address, reward_type: String, active: bool) -> Result<(), Error> {
        let contract_admin: Address = env.storage().instance().get(&ADMIN).unwrap();
        if admin != contract_admin {
            return Err(Error::Unauthorized);
        }

        let mut rules: Vec<RewardRule> = env.storage().instance().get(&REWARD_RULES).unwrap_or(Vec::new(&env));
        for mut rule in rules.iter_mut() {
            if rule.reward_type == reward_type {
                rule.active = active;
                break;
            }
        }
        env.storage().instance().set(&REWARD_RULES, &rules);

        Ok(())
    }
}

#[cfg(test)]
mod test;
