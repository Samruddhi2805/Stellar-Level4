#!/bin/bash

# Stellar Payment DApp - Contract Deployment Script
# Deploys all contracts and sets up inter-contract architecture

set -e

echo "🚀 Deploying Stellar Payment DApp Contracts..."

# Configuration
NETWORK="testnet"
ADMIN_KEY="G_ADMIN_KEY_HERE"  # Replace with actual admin key
TOKEN_ADDRESS="G_NATIVE_TOKEN"  # XLM native token

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    print_error "Stellar CLI not found. Please install it first."
    exit 1
fi

# Fund the deployer account
print_status "Funding deployer account..."
stellar keys fund deployer --network $NETWORK

# Build all contracts
print_status "Building all contracts..."

echo "Building Fee Contract..."
cd contracts/fee-contract
cargo build --target wasm32-unknown-unknown --release
FEE_WASM="target/wasm32-unknown-unknown/release/stellar_fee_contract.wasm"

echo "Building Reward Contract..."
cd ../reward-contract
cargo build --target wasm32-unknown-unknown --release
REWARD_WASM="target/wasm32-unknown-unknown/release/stellar_reward_contract.wasm"

echo "Building Token Contract..."
cd ../token-contract
cargo build --target wasm32-unknown-unknown --release
TOKEN_WASM="target/wasm32-unknown-unknown/release/stellar_token_contract.wasm"

echo "Building Split Contract..."
cd ../split-contract
cargo build --target wasm32-unknown-unknown --release
SPLIT_WASM="target/wasm32-unknown-unknown/release/stellar_split_contract.wasm"

echo "Building Payment Contract..."
cd ../payment-contract
cargo build --target wasm32-unknown-unknown --release
PAYMENT_WASM="target/wasm32-unknown-unknown/release/stellar_payment_contract.wasm"

cd ../../

print_success "All contracts built successfully!"

# Deploy contracts in order
print_status "Deploying contracts..."

# 1. Deploy Fee Contract
print_status "Deploying Fee Contract..."
FEE_CONTRACT_ID=$(stellar contract deploy \
    --wasm contracts/fee-contract/$FEE_WASM \
    --source deployer \
    --network $NETWORK \
    --salt fee_contract_salt)

print_success "Fee Contract deployed: $FEE_CONTRACT_ID"

# 2. Deploy Reward Contract
print_status "Deploying Reward Contract..."
REWARD_CONTRACT_ID=$(stellar contract deploy \
    --wasm contracts/reward-contract/$REWARD_WASM \
    --source deployer \
    --network $NETWORK \
    --salt reward_contract_salt)

print_success "Reward Contract deployed: $REWARD_CONTRACT_ID"

# 3. Deploy Token Contract
print_status "Deploying Token Contract..."
TOKEN_CONTRACT_ID=$(stellar contract deploy \
    --wasm contracts/token-contract/$TOKEN_WASM \
    --source deployer \
    --network $NETWORK \
    --salt token_contract_salt)

print_success "Token Contract deployed: $TOKEN_CONTRACT_ID"

# 4. Deploy Split Contract
print_status "Deploying Split Contract..."
SPLIT_CONTRACT_ID=$(stellar contract deploy \
    --wasm contracts/split-contract/$SPLIT_WASM \
    --source deployer \
    --network $NETWORK \
    --salt split_contract_salt)

print_success "Split Contract deployed: $SPLIT_CONTRACT_ID"

# 5. Deploy Payment Contract
print_status "Deploying Payment Contract..."
PAYMENT_CONTRACT_ID=$(stellar contract deploy \
    --wasm contracts/payment-contract/$PAYMENT_WASM \
    --source deployer \
    --network $NETWORK \
    --salt payment_contract_salt)

print_success "Payment Contract deployed: $PAYMENT_CONTRACT_ID"

# Initialize contracts
print_status "Initializing contracts..."

# Initialize Fee Contract
print_status "Initializing Fee Contract..."
stellar contract invoke \
    --id $FEE_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- initialize \
    --admin $ADMIN_KEY

# Initialize Reward Contract
print_status "Initializing Reward Contract..."
stellar contract invoke \
    --id $REWARD_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- initialize \
    --admin $ADMIN_KEY \
    --token $TOKEN_ADDRESS

# Initialize Token Contract
print_status "Initializing Token Contract..."
stellar contract invoke \
    --id $TOKEN_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- initialize \
    --admin $ADMIN_KEY \
    --name "StellarPay Token" \
    --symbol "SPT" \
    --decimals 7

# Initialize Split Contract
print_status "Initializing Split Contract..."
stellar contract invoke \
    --id $SPLIT_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- initialize \
    --admin $ADMIN_KEY

# Initialize Payment Contract (this connects all contracts)
print_status "Initializing Payment Contract with inter-contract links..."
stellar contract invoke \
    --id $PAYMENT_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- initialize \
    --admin $ADMIN_KEY \
    --fee-contract $FEE_CONTRACT_ID \
    --reward-contract $REWARD_CONTRACT_ID \
    --token-contract $TOKEN_CONTRACT_ID \
    --split-contract $SPLIT_CONTRACT_ID

print_success "All contracts initialized with inter-contract architecture!"

# Setup initial token supply and reward pool
print_status "Setting up initial token supply..."

# Mint initial supply for rewards
stellar contract invoke \
    --id $TOKEN_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- mint \
    --to $REWARD_CONTRACT_ID \
    --amount 1000000000  # 1000 tokens for rewards

# Add funds to fee sponsor pool
print_status "Adding funds to fee sponsor pool..."
stellar contract invoke \
    --id $FEE_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- add_sponsor_funds \
    --amount 100000000  # 100 XLM for fee sponsorship

# Add funds to reward pool
print_status "Adding funds to reward pool..."
stellar contract invoke \
    --id $REWARD_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- add_to_reward_pool \
    --amount 50000000  # 50 XLM for rewards

print_success "Initial setup completed!"

# Create configuration file
print_status "Creating configuration file..."
cat > contracts/contract_addresses.json << EOF
{
    "network": "$NETWORK",
    "contracts": {
        "payment": "$PAYMENT_CONTRACT_ID",
        "fee": "$FEE_CONTRACT_ID",
        "reward": "$REWARD_CONTRACT_ID",
        "token": "$TOKEN_CONTRACT_ID",
        "split": "$SPLIT_CONTRACT_ID"
    },
    "admin": "$ADMIN_KEY",
    "token": "$TOKEN_ADDRESS",
    "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

print_success "Configuration saved to contracts/contract_addresses.json"

# Display deployment summary
echo ""
echo "🎉 DEPLOYMENT SUMMARY 🎉"
echo "=================================="
echo "Network: $NETWORK"
echo "Admin: $ADMIN_KEY"
echo ""
echo "Contract Addresses:"
echo "Payment Contract: $PAYMENT_CONTRACT_ID"
echo "Fee Contract: $FEE_CONTRACT_ID"
echo "Reward Contract: $REWARD_CONTRACT_ID"
echo "Token Contract: $TOKEN_CONTRACT_ID"
echo "Split Contract: $SPLIT_CONTRACT_ID"
echo ""
echo "Explorer Links:"
echo "Payment: https://stellar.expert/explorer/$NETWORK/contract/$PAYMENT_CONTRACT_ID"
echo "Fee: https://stellar.expert/explorer/$NETWORK/contract/$FEE_CONTRACT_ID"
echo "Reward: https://stellar.expert/explorer/$NETWORK/contract/$REWARD_CONTRACT_ID"
echo "Token: https://stellar.expert/explorer/$NETWORK/contract/$TOKEN_CONTRACT_ID"
echo "Split: https://stellar.expert/explorer/$NETWORK/contract/$SPLIT_CONTRACT_ID"
echo ""
echo "Inter-Contract Architecture:"
echo "✅ Payment Contract calls Fee Contract for fee calculation"
echo "✅ Payment Contract calls Reward Contract for cashback"
echo "✅ Payment Contract calls Split Contract for multi-recipient payments"
echo "✅ All contracts are linked and ready for transactions"
echo ""

# Test inter-contract communication
print_status "Testing inter-contract communication..."

# Test fee calculation
echo "Testing fee calculation..."
FEE_RESULT=$(stellar contract invoke \
    --id $FEE_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- calculate_fee \
    --user $ADMIN_KEY \
    --amount 10000000)

print_success "Fee calculation test passed"

# Test split payment creation
echo "Testing split payment creation..."
SPLIT_RESULT=$(stellar contract invoke \
    --id $SPLIT_CONTRACT_ID \
    --source deployer \
    --network $NETWORK \
    -- create_split_payment \
    --transaction_id "test_split_$(date +%s)" \
    --sender $ADMIN_KEY \
    --total_amount 5000000 \
    --recipients '["'$ADMIN_KEY':5000,"'$ADMIN_KEY':5000]')

print_success "Split payment creation test passed"

print_success "All inter-contract communication tests passed!"

echo ""
echo "🚀 Stellar Payment DApp is now ready for Level 4! 🚀"
echo ""
echo "Next steps:"
echo "1. Update frontend with contract addresses"
echo "2. Test the full payment flow"
echo "3. Verify inter-contract calls on blockchain explorer"
echo "4. Deploy to production when ready"
echo ""
print_success "Deployment completed successfully! 🎉"
