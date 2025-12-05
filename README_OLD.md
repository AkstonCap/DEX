# Nexus DEX Module

A user-friendly decentralized exchange (DEX) module for the Nexus Wallet. Trade tokens, view market data, and swap stablecoins—all on-chain with enterprise-grade security.

## ✨ Features

- **🚀 Market Fill Trading** - Quick one-click buy/sell with automatic best price matching
- **📊 Real-Time Market Data** - Live prices, order books, volumes, and market depth charts
- **📈 Advanced Trading** - Place limit orders (bid/ask) and execute specific orders from the book
- **🔄 Cross-Chain Stablecoin Swap** - Bridge between USDC (Solana) and USDD (Nexus)
- **🔒 Secure** - All transactions require PIN confirmation through the Nexus Wallet security model
- **📉 Charts & Analytics** - Candlestick charts, volume data, and market depth visualization

## 🎯 Quick Start

### Installation (Verified Release)

1. **Download Nexus Wallet** - Get the [latest version](https://github.com/Nexusoft/NexusInterface/releases/latest)
2. **Get the DEX Module** - Download from our [releases page](https://github.com/AkstonCap/DEX/releases)
3. **Install** - Open Nexus Wallet → Settings → Modules → Import the downloaded zip
4. **Start Trading** - The DEX icon will appear in your navigation bar

### Installation (Beta/Development Version)

For testing unreleased features:

1. Download the [latest source code](https://github.com/AkstonCap/DEX/releases/latest)
2. Unzip and open terminal in the folder
3. Run:
   ```bash
   npm install
   npm run build
   ```
4. Enable Developer Mode in Nexus Wallet (Settings → Application)
5. Drag the folder into Settings → Modules → "Add module"

## 📖 User Guide

### Getting Started with Trading

1. **Select a Market Pair** - Enter token names in the top-right corner (e.g., DIST and NXS)
2. **Click Refresh** - Updates all data for your selected pair
3. **Choose Trading Method**:
   - **Market Fill** (Default) - Simplest option for quick trades
   - **Bid/Ask** - Place limit orders at specific prices
   - **Execute** - Fill existing orders from the order book

### Market Fill Trading (Recommended for Beginners)

The easiest way to trade:

1. Select **Market Fill** (selected by default)
2. Choose **Buy** or **Sell**
3. Enter your **Max Payment Amount** (how much you want to spend)
4. Select your **payment** and **receiving accounts**
5. Click **Find Best Order & Execute**
6. Review the order details and confirm with your PIN

The system automatically finds the best available price within your budget and includes 10% price protection.

## 📱 Module Tabs

- At-a-glance metrics for the selected market pair (price, 24h change, volume, etc.)
- Compressed Order Book view (best bids/asks with aggregation)
- Global Trade History for the pair
- Your last trades and your active/open orders
- Manual refresh and periodic auto-refresh of market data

### Trading desk

- Place Buy/Sell orders through secure wallet prompts (no keys in the module)
- Inputs for price and amount, with computed totals
- Quick actions to use best bid/ask from the book
- Your open orders list with the ability to cancel
- Validations for numeric input and available balances

### Charts and trading history

- Candlestick and/or line charts for price over time
- Time span selector (short to long horizons)
- Volume overlay and tooltips
- Synchronizes with the chosen market pair

### Market depth

- Visual depth chart of the order book with cumulative bids/asks
- Helps identify support/resistance levels and liquidity concentration
- Updates with new best bid/ask snapshots

### Markets

- Tokens list with live market attributes vs NXS: last price, bid, ask, volume, market cap
- Search filter to find specific tokens by name
- Wide-table layout with responsive column sizing and shortened addresses
- Auto-refresh interval for asset lists (default ~60 seconds)

### Stablecoin Swap

Swap between USDC on Solana and USDD on Nexus, directly from the module:

- USDC → USDD (Solana to Nexus)
   - From your Solana wallet, send USDC to the service address with a memo: `nexus: <USDD_account>`
   - Paste the Solana transaction signature in the module
   - The module verifies the Solana transaction on-chain and monitors Nexus for the incoming USDD
   - Once detected, status updates to completed

- USDD → USDC (Nexus to Solana)
   - Enter the Solana address that will receive USDC
   - The module first verifies that a USDC associated token account (ATA) exists for that address on Solana
   - Submit the swap: the module debits USDD from your selected Nexus account (wallet prompt required)
   - It then monitors for a Solana payout and confirms receipt based on on-chain data

Fees and minimums for swaps:

- Minimum amount: 0.2 (both directions)
- Fees: 0.1 USDC flat + 0.1% of amount
- The UI shows an “Estimated received” amount after fees before you confirm

Notes and constraints:

- Memo format for USDC → USDD must be exactly: `nexus: <USDD_account>`
- Solana: mainnet USDC mint is used (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
- The swap UI uses Solana JSON-RPC directly; no external centralized service URL is required
- You can optionally override the Solana RPC endpoint via `SOLANA_RPC_URL` environment variable

### Module security

The module uses API's from Nexus LLL-TAO, meaning that no transactions or other blockchain functionalities are coded from scratch. All transactions in this module happens through the secureApiCall which is an in-built utility in the nexus global variable in the Nexus Interface (https://github.com/Nexusoft/NexusInterface/blob/master/docs/Modules/module-security.md#secureapicall), with a pre-defined window pop-up and required pin input for execution.
In this way the module inherits similar security as the wallet.

More info on module security can be found here: https://github.com/Nexusoft/NexusInterface/blob/master/docs/Modules/module-security.md

### Additional details

- Numbers formatting: very small decimals are displayed with leading-zero counts for readability in markets tables.
- Addresses in tables are shortened for compactness (first 4 … last 4).
- Asset Markets have tailored wide-table styles to fit fewer columns cleanly.
