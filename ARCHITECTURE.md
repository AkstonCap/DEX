# ARCHITECTURE.md

## Overview
The DEX module is a React/Redux application that integrates with the Nexus Wallet to provide a decentralized exchange experience.

## State Management
- **Redux** is used for global state.
- Key slices:
  - `ui.activeTab` – current navigation tab
  - `ui.market` – market data (order book, pairs, trades)
  - `ui.nft` – NFT marketplace data
  - `settings` – user settings (timespan, etc.)
  - `nexus` – wallet data from the Nexus module

## Data Flow
1. UI components dispatch actions (e.g., `fetchMarketData()`).
2. Action creators call API utilities (`apiCache.js`, `nexus-module`).
3. Reducers update state based on action types.
4. Components subscribe to state via `useSelector` and re‑render when relevant data changes.

## Component Hierarchy
- `App` (root)
  - Tabs: Overview, Trade, Chart, MarketDepth, Markets, Portfolio, StablecoinSwap, NFT Marketplace
  - Each tab contains presentational and container components.
- Reusable components: `OrderBookComp`, `TradeForm`, `VirtualizedTable`, `RefreshButton`, etc.

## Integration with Nexus Wallet
- The module reads wallet data from the `nexus` slice (provided by the Nexus Wallet Redux module).
- Transactions are initiated via `secureApiCall` which triggers the wallet’s PIN prompt.
- On‑chain events are monitored via polling (`fetchMarketData` every 15 seconds) and Redux updates.

## Build System
- Webpack with Babel (`webpack.config.babel.js`, `webpack-dev.config.babel.js`).
- Production build: `npm run build`.
- Development server: `npm run dev`.