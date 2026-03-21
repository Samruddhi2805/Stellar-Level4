#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger as _, Address, Env};
use soroban_sdk::token::StellarAssetClient;

#[test]
fn test_payment_and_volume() {
    let env = Env::default();
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    
    // Create token contract
    let token_admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = StellarAssetClient::new(&env, &token_contract_id.address());
    let token_id = token_contract_id.address();
    
    // Mock auth for all addresses including token admin
    env.mock_all_auths();
    
    // Mint tokens to sender
    token_client.mint(&sender, &1000);

    // Make a payment
    let amount = 100;
    let record = client.pay(&token_id, &sender, &receiver, &amount);

    assert_eq!(record.sender, sender);
    assert_eq!(record.receiver, receiver);
    assert_eq!(record.amount, amount);

    let volume = client.get_volume();
    assert_eq!(volume, amount);
    
    let payments = client.get_payments();
    assert_eq!(payments.len(), 1);
    
    let token_viewer = token::Client::new(&env, &token_id);
    assert_eq!(token_viewer.balance(&sender), 900);
    assert_eq!(token_viewer.balance(&receiver), 100);
}

#[test]
fn test_invalid_amount() {
    let env = Env::default();
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();

    // Trying to transfer 0
    let res = client.try_pay(&token, &sender, &receiver, &0);
    assert!(res.is_err());
    
    // Check volume is still 0
    assert_eq!(client.get_volume(), 0);
}

#[test]
fn test_multiple_payments() {
    let env = Env::default();
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let receiver1 = Address::generate(&env);
    let receiver2 = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = StellarAssetClient::new(&env, &token_contract_id.address());
    
    // Mock auth for all addresses including token admin
    env.mock_all_auths();
    
    token_client.mint(&sender, &1000);

    client.pay(&token_contract_id.address(), &sender, &receiver1, &200);
    client.pay(&token_contract_id.address(), &sender, &receiver2, &300);

    let volume = client.get_volume();
    assert_eq!(volume, 500);

    let payments = client.get_payments();
    assert_eq!(payments.len(), 2);
    assert_eq!(payments.get(0).unwrap().receiver, receiver1);
    assert_eq!(payments.get(1).unwrap().receiver, receiver2);
}

#[test]
fn test_negative_amount() {
    let env = Env::default();
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();

    // Trying to transfer negative amount
    let res = client.try_pay(&token, &sender, &receiver, &-100);
    assert!(res.is_err());
    
    // Check volume is still 0
    assert_eq!(client.get_volume(), 0);
}

#[test]
fn test_insufficient_balance() {
    let env = Env::default();
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = StellarAssetClient::new(&env, &token_contract_id.address());
    
    // Mock auth for all addresses including token admin
    env.mock_all_auths();
    
    // Don't mint any tokens to sender (balance = 0)
    
    // Try to pay with insufficient balance
    let res = client.try_pay(&token_contract_id.address(), &sender, &receiver, &100);
    assert!(res.is_err());
    
    // Check volume is still 0
    assert_eq!(client.get_volume(), 0);
}

#[test]
fn test_payment_record_structure() {
    let env = Env::default();
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    
    let token_admin = Address::generate(&env);
    let token_contract_id = env.register_stellar_asset_contract_v2(token_admin.clone());
    let token_client = StellarAssetClient::new(&env, &token_contract_id.address());
    
    env.mock_all_auths();
    token_client.mint(&sender, &1000);

    // Set a timestamp in the environment
    env.ledger().set_timestamp(12345);

    // Make a payment
    let amount = 150;
    let record = client.pay(&token_contract_id.address(), &sender, &receiver, &amount);

    // Verify payment record structure
    assert_eq!(record.sender, sender);
    assert_eq!(record.receiver, receiver);
    assert_eq!(record.amount, amount);
    assert_eq!(record.timestamp, 12345);
}

#[test]
fn test_zero_amount_payment() {
    let env = Env::default();
    let contract_id = env.register(PaymentContract, ());
    let client = PaymentContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    let token = Address::generate(&env);

    env.mock_all_auths();

    // Trying to transfer exactly 0
    let res = client.try_pay(&token, &sender, &receiver, &0);
    assert!(res.is_err());
    
    // Check no payments were recorded
    assert_eq!(client.get_payments().len(), 0);
    assert_eq!(client.get_volume(), 0);
}
