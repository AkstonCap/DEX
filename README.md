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

### 📊 Overview
- Quick view of current market metrics (price, 24h change, volume)
- Order book with best bids and asks
- Recent trades for the market pair
- Your active orders and trade history
- Auto-refresh every 10-60 seconds

### 💱 Trade
- **Market Fill** - Quick buy/sell with automatic price matching (recommended)
- **Bid/Ask** - Place custom limit orders at your desired price
- **Execute** - Fill specific orders from the order book
- View and cancel your open orders
- Real-time balance validation

### 📈 Charts
- Price history with candlestick or line charts
- Adjustable time spans (1h to 30 days)
- Volume overlays and interactive tooltips
- Synchronized with your selected market pair

### 📉 Market Depth
- Visual representation of order book liquidity
- Cumulative bid/ask depth chart
- Toggle between logarithmic and linear scales
- Identify support and resistance levels

### 🏪 Markets
- Browse all available tokens and their metrics
- Live prices, volumes, and market caps (vs NXS)
- Search and filter by token name
- One-click market pair selection

### 🔄 Stablecoin Swap

Bridge between Solana USDC and Nexus USDD:

**USDC → USDD (Solana to Nexus)**
1. Send USDC on Solana to the service address with memo: `nexus: <your_USDD_account>`
2. Paste your Solana transaction signature in the module
3. Module verifies on-chain and monitors for your USDD arrival
4. Status updates automatically when complete

**USDD → USDC (Nexus to Solana)**
1. Enter your Solana wallet address (must have USDC token account)
2. Module verifies your Solana account setup
3. Confirm the swap with your PIN
4. USDC arrives at your Solana address

**Swap Fees:**
- Minimum: 0.2 (both directions)
- Fee: 0.1 flat + 0.1% of amount
- "Estimated received" shown before confirmation

## 🔒 Security

All transactions use the Nexus Wallet's built-in security model:
- PIN required for every transaction
- No private keys exposed to the module
- Direct blockchain API calls (no intermediaries)
- Open source and auditable

Learn more: [Nexus Module Security Documentation](https://github.com/Nexusoft/NexusInterface/blob/master/docs/Modules/module-security.md)

## ⚠️ Important Notes

- **Token Requirements** - Currently only works with tokens that have global names
- **Market Pair Format** - Enter as BASE/QUOTE (e.g., DIST/NXS)
- **Stablecoin Swap** - Uses Solana mainnet USDC mint (`EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`)
- **Network** - Requires connection to Nexus network and (for swaps) Solana RPC

## 🛠️ Advanced Configuration

**Custom Solana RPC Endpoint** (optional):
```bash
export SOLANA_RPC_URL=https://your-custom-rpc-url.com
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/AkstonCap/DEX/issues)
- **Nexus Community**: [Nexus Slack](https://nexus.io/community)

---

Made with ❤️ for the Nexus community
