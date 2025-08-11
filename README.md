# Nexus DEX module

This is a decentralized exchange wallet module for the Nexus Interface built with React and Redux. It provides:

- Markets and Asset views with prices, bids/asks, volumes, and market caps (on-chain data)
- Order book, recent trades, your open orders and trade history
- Charts and market depth visualizations
- Trading desk to place/cancel orders (through secure wallet prompts)
- Cross-chain Stablecoin Swap between USDC (Solana) and USDD (Nexus)

Everything is on-chain and executed via the Nexus Interface security model.

### How to install module

1. Download and install the [latest version of Nexus Wallet](https://github.com/Nexusoft/NexusInterface/releases/latest) if you haven't.
2. Get the latest verified release of this DEX module from the [releases page](https://github.com/AkstonCap/DEX/releases).
3. Download the zip package from the latest release (for example: "dex_module@X.Y.Z.zip").
4. Go to the Nexus Wallet -> Settings -> Modules
5. Import the downloaded zip in the "Add module" box
6. Click "Install module" in pop-up.

### How to install unverified beta- or official releases of this module (not yet verified by Nexus DAO dev team)

1. Download and install the [latest version of Nexus Wallet](https://github.com/Nexusoft/NexusInterface/releases/latest) if you haven't.
2. Download [this module's zip file](https://github.com/AkstonCap/DEX/releases/latest).
3. Unzip the files into your local repository.
4. Open the terminal and redirect to inside the unzipped folder.
5. Run
   "npm install"
   and then
   "npm run build"
7. Open Nexus Wallet, go to Settings/Modules, drag and drop the unzipped folder into the "Add module" section and click "Install module" when prompted (requires that your wallet is in "Developer mode").
8. After the wallet refreshes, an item for this template module will be added into the bottom navigation bar. Click on it to open the module.

### Module overview

In the top right corner of the module you'll see two input fields and a refresh button, these defines and updates the chosen market pair. To update the market pair, insert the global names of the two tokens to trade (for instance DIST and NXS, yielding the market pair DIST/NXS) and click on the refresh button. 
The module currently only works for tokens with a global name.

The module furthermore consists of these tabs:

### Overview

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
