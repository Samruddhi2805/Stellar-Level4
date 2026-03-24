# 🌌 Stellar Payment dApp — Level 4 (Advanced Inter-Contract Architecture)

<p align="center">
  <img src="https://img.shields.io/badge/Stellar-Testnet-0ff4c6?style=for-the-badge&logo=stellar&logoColor=black" />
  <img src="https://img.shields.io/badge/Soroban-Rust%20Contracts-7b2ff7?style=for-the-badge&logo=rust&logoColor=white" />
  <img src="https://img.shields.io/badge/React-19%20%2B%20TypeScript-4cc9f0?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Inter--Contract-Architecture-ff6b6b?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

> **A production-ready, enterprise-grade decentralized payment DApp on Stellar with advanced inter-contract architecture, real-time streaming, comprehensive rewards system, and complex payment flows.**

---

## 📖 Quick Links

- 📚 **[Complete README](README_STRUCTURED.md)** — Full documentation, architecture, deployment guide
- 🚀 **[Level 4 Features](README_Level4.md)** — Advanced features overview
- 🏗️ **[Inter-Contract Architecture](README_InterContract.md)** — Smart contract details
- 📋 **[Implementation Summary](LEVEL4_SUMMARY.md)** — What was built

---

## 📖 Overview

This is **Level 4** of the Stellar Payment dApp series — the complete, submission-ready version with advanced inter-contract architecture.

The dApp allows users to:
- Connect their **Freighter wallet** to Stellar Testnet
- Send **real XLM transactions** verified on Stellar Explorer with sophisticated fee management
- Perform **single and split payments** across multiple recipients
- Earn **cashback rewards** (1% rate) and streak bonuses
- Track **referral rewards** and activity history
- Monitor **real-time contract events** via blockchain streaming
- View wallet balance with **localStorage caching** for instant loads
- See **comprehensive contract stats** from deployed Soroban contracts
- Track transaction history with **Explorer links** and detailed analytics

---

## ✨ Features at a Glance

✅ **Inter-Contract Architecture** — 5 separate deployed smart contracts  
✅ **Real XLM Transactions** — Live Testnet payments verified on Stellar Explorer  
✅ **Single & Split Payments** — Send to one or multiple recipients  
✅ **Smart Fee Management** — Tiered fees with sponsorship & discounts  
✅ **Cashback Rewards** — 1% instant reward on every payment  
✅ **Activity Streaks** — Daily bonuses for consistent usage  
✅ **Referral Program** — Invite users and earn rewards  
✅ **Real-Time Streaming** — WebSocket event monitoring  
✅ **localStorage Caching** — Instant load with persistent state  
✅ **Mobile Responsive** — Works on all device sizes  
✅ **10+ Passing Tests** — Comprehensive test coverage  
✅ **Production Ready** — CI/CD pipeline, error handling, security

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + TypeScript + Vite 7 |
| **Smart Contract** | Soroban (Rust) on Stellar Testnet |
| **Wallet** | Freighter via `@creit.tech/stellar-wallets-kit` |
| **Blockchain SDK** | `@stellar/stellar-sdk` v14 |
| **Styling** | Vanilla CSS (no frameworks) |
| **Ttyling** | Tailwind CSS + Vanilla CSS |
| **State Management** | Zustand + localStorage |
| **Smart Contracts** | Soroban (Rust) — 5 deployed contracts |
| **Wallet** | Freighter + stellar-wallets-kit |
| **Blockchain SDK** | @stellar/stellar-sdk v14 |
| **Real-Time** | WebSocket streaming |
| **Testing** | Vitest + React Testing Library |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel / Netlify
Smart Contracts

All 5 contracts are deployed on **Stellar Testnet**:

1. **Payment Contract** — Main entry point, coordinates all interactions
2. **Fee Contract** — Dynamic fee calculation with tiered pricing
3. **Reward Contract** — Cashback, streaks, referral distribution
4. **Split Contract** — Multi-recipient payment distribution
5. **Token Contract** — Custom SPT token for rewards

```
Payment Contract calls:
├─ Fee Contract → calculate_fee(amount)
├─ Reward Contract → calculate_reward(user)
└─ Split Contract → distribute(recipients)
    └─ Token Contract → mint_rewards(user)

**Caching Flow:**
1. On load → show cached data instantly (address, balance, tx history, contract state)
2. In background → fetch fresh data from network
3. On any update → write to localStorage

---

## 📂 Project Structure

```
Stellar level 3/
├── frontend/
│   ├── Level 4/
├── contracts/                        # 5 Smart Contracts
│   ├── payment-contract/             # Core payments
│   ├── fee-contract/                 # Fee management
│   ├── reward-contract/              # Rewards system
│   ├── split-contract/               # Multi-recipient
│   └── token-contract/               # Utility token
├── frontend/                         # React + TypeScript
│   ├── src/components/               # UI components
│   ├── src/lib/                      # Stellar SDK integration
│   ├── src/store/                    # Zustand state
│   └── src/test/                     # Tests
├── scripts/                          # Deployment & demos
├── README_STRUCTURED.md              # Complete documentation
├── README_Level4.md                  # Features overview
├── README_InterContract.md           # Architecture details
└── LEVEL4_SUMMARY.md                 # Implementation summary
---

## 🚀 Installation

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Rust** + **Cargo** (for contract)
- **Stellar CLI** (for contract deployment)
- **Freighter** browser extension (Testnet mode)

### 1. Clone & Install

```bash
git clone https://github.com/Samruddhi2805/Stellar-Level3.git
cd "Stellar-Level3/frontend"
npm install
```
Quick Start

### Install

```bash
# Install frontend dependencies
cd frontend
npm install

# Install Rust tools (for contracts)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install --locked stellar-cli --features opt
rustup target add wasm32-unknown-unknown
```

### Run

```bash
# Start development server
cd frontend
npm run dev

# Opens at http://localhost:5173
```

### Test

```bash
# Frontend tests
npm test

# Contract tests
cd contracts && cargo test
```

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

### Deploy to Testnet

```bBuild Contracts

```bash
cd contracts

# Build all contracts
cargo build --target wasm32-unknown-unknown --release
```

### Deploy to Testnet

```bash
# Generate deployer keypair and fund it
stellar keys generate deployer --network testnet --fund

# Deploy all 5 contracts
stellar contract deploy \
  --wasm contracts/payment-contract/target/wasm32-unknown-unknown/release/stellar_payment_contract.wasm \
  --source deployer \
  --network testnet

# Repeat for: fee-contract, reward-contract, split-contract, token-contract
```

### Automated Deployment

```bash
chmod +x scripts/deploy_contracts.sh
./scripts/deploy_contracts.sh
```

This deploys all contracts and updates contract IDs in `frontend/src/lib/stellar_Level4.ts`
✓ Test 1 – App renders HeroCard when not connected
✓ Test 2 – HeroCard loading state (2 tests)
✓ Test 3 – SendPaymentForm insufficient balance validation
✓ Test 4 – SendPaymentForm recipient address validation (2 tests)
✓ Test 5 – SendPaymentForm pending / transaction state (3 tests)
✓ Test 6 – WalletCard renders correctly (2 tests)
✓ Test 7 – ContractStatsCard (2 tests)
✓ Test 8 – ErrorToast notifications (2 tests)
✓ Test 9 – Stellar utility functions (6 tests)
✓ Test 10 – SendPaymentForm quick amount buttons

Tests: 10 passed (23 assertions)
```Testing

```bash
# Frontend (10+ tests)
cd frontend
npm test
npm run test:watch

# Contracts (3+ tests per contract)
cd contracts
cargo test
```

Expected: **25+ assertions passing** ✅
## 🔍 Verify on Stellar Explorer

After sending any transaction:

1. Copy the transaction hash shown in the green Success bar
2. Visit: `https://stellar.expert/explorer/testnet/tx/YOUR_TX_HASH`
3. Or click the **"Explorer ↗"** link in the Transaction History panel

To verify the contract:
- `https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2X3ZNKU`

---

## 🎥 Demo Video Script (1-Minute Guide)

**[0:00 – 0:10] Overview**
> "This is the Stellar Payment dApp Level 3 — a fully functional dApp running on Stellar Testnet with a Soroban smart contract."

**[0:00 - 0:01] UI Tour**
> "The dark aurora glassmorphism interface features animated backgrounds, a floating navbar, and the pre-connect hero card with a pulsing diamond animation."

**[0:02 - 0:03] Connect Wallet**
> "Click ⚡ Connect Freighter. The Freighter modal opens. Select Freighter and approve — your address and XLM balance load immediately from the network."

**[0:04 – 0:29] Send XLM**
> "Enter a recipient address, type an amount or click a quick-amount button, then click 🚀 Send XLM. The progress steps animate — signing → submitting → confirming."

**[0:29 – 0:30] Explorer Verification**
> "The green success bar shows the tx hash. Click Explorer ↗ to see the confirmed transaction on stellar.expert."

**[0:29 – 0:30] Tests & Contract State**
> "The Contract Stats card shows total volume and payments from the on-chain state. Running `npm test` shows 10 passing tests — all green."

**[0:31 - 0:38] Another Transaction to show one error handling**
>"Onclick to cancel transaction Failed Transaction was there."

 **[0:39 - 0:42]

### Live Demo
- **Frontend**: [stellar-level-4.vercel.app](https://stellar-level-4.vercel.app)
- **Repository**: [github.com/Samruddhi2805/Stellar-Level4](https://github.com/Samruddhi2805/Stellar-Level4)

### Deploy to Vercel

```bash
cd frontend
npm run build
vercel --prod
```

### Deploy to Netlify

```bash
cd frontend
npm run build
# Drag frontend/dist to Netlify or connect GitHub
```
// On app load — instant data display
const cachedAddr = getCachedWalletAddress();     // localStorage
const cachedBal  = getCachedBalance();            // localStorage
con📸 Key Features

### 1. Connect Freighter
- Click "⚡ Connect Freighter"
- Approve in wallet modal
- Address & balance load instantly

### 2. Send Payment
- Enter recipient address
- Type amount or use quick buttons
- See fee breakdown automatically
- Click "🚀 Send XLM"

### 3. Split Payment
- Add multiple recipients
- Set percentages (must = 100%)
- System calculates split fee discount
- Distributes in parallel

### 4. Earn Rewards
- **Cashback**: 1% on every payment
- **Streaks**: +0.1% per consecutive day
- **Referral**: 0.5 XLM per friend
- **Tokens**: SPT token distribution

### 5. Verify On-Chain
- Click "Explorer ↗" on any TX
- View on Stellar Expert
- See contract calls and state changes
- Fully transparent & verifiable
fix:� Full Documentation

For comprehensive documentation including:
- ✅ Detailed architecture diagrams
- ✅ Smart contract communication patterns
- ✅ Complete deployment guide with scripts
- ✅ Full test examples
- ✅ Error handling strategies
- ✅ Caching implementation details
- ✅ Demo video script
- ✅ Security considerations

👉 **See [README_STRUCTURED.md](README_STRUCTURED.md)**

---

## ⚡ Key Achievements

✅ **5 deployed smart contracts** working together  
✅ **Real Testnet transactions** with Freighter signing  
✅ **Inter-contract communication** fully implemented  
✅ **localStorage caching** for instant loads  
✅ **25+ passing tests** (frontend + contracts)  
✅ **Production-grade error handling**  
✅ **Mobile responsive design**  
✅ **Real-time event streaming**  
✅ **Complete professional documentation**  
✅ **CI/CD pipeline** with GitHub Actions  

---

## 🎯 Getting Started

1. **Clone**: `git clone https://github.com/Samruddhi2805/Stellar-Level4.git`
2. **Install**: `cd frontend && npm install`
3. **Run**: `npm run dev`
4. **Test**: `npm test`
5. **Deploy**: `npm run build && vercel --prod`

---

## 📄 License

MIT — Free to use, modify, and distribute

See [LICENSE](LICENSE) for details

---

**Built with ❤️ for Stellar Developers**

**Production-Ready • Fully Tested • Live on Testnet**