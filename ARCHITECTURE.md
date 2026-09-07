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
  - Active tabs: Overview, Trade, Chart, MarketDepth, Markets, Portfolio, NFT Marketplace (`NFTArt` state key), and Cross-chain swaps (`StablecoinSwap` state key).
  - `StablecoinSwap` is mounted by `src/App/Main.js`; exposing inspection/recovery controls does not enable funding.
  - Each tab contains presentational and container components.
- Shared reusable components live under `src/components/`.
- The app-shell ErrorBoundary lives at `src/App/components/ErrorBoundary.js`; its tracked relocation and Main import are reconciled.
- `VirtualizedTable` is **not implemented in the active repository**. A previous recovery checkout contained unintegrated WIP, but that checkout is no longer present under `/home/brutus/github` and is not an implementation source.

> Current merged implementation and verification: [branch reconciliation](docs/BRANCH_RECONCILIATION.md). The dated development reviews preserve earlier, pre-implementation assessments rather than the current swap status.

## Cross-chain swaps: implemented client, funding release-gated

The visible **Cross-chain swaps** tab now uses a separate swap domain rather than the old
hardcoded monolith. See [operation, wallet alternatives and release requirements](docs/CROSS_CHAIN_SWAPS.md).
The earlier [evaluation](SWAP_SERVICE_EVALUATION.md) is retained as a pre-implementation snapshot.

- `src/swap/providers.js` discovers recommended-v1 `nexusBridgeHeartbeat` records, rejects
  unsupported schemas, keys selection by exact register address and re-reads selected terms.
- `money.js` quotes exact integer units with token-specific decimals, directional fees and minima.
- `nexus.js` and `solana.js` validate actual token/custody accounts and consume exact finalized
  source/output evidence. Symbols are labels, never asset identity.
- `jobs.js` and `controller.js` persist scoped immutable intent before funding and preserve
  unknown outcomes. The user's Nexus DEBIT and provider CREDIT are distinct identities;
  outgoing Solana memos bind the provider CREDIT transaction plus contract ID.
- `persistence.js` serializes journal and settings updates. Legacy settings retain the current
  wallet API; financial writes require a documented future acknowledged-storage host capability.
  Current Nexus Interface's fire-and-forget `updateStorage` is insufficient. No host change was authorized.
- The bundled browser signer constructs a transfer plus memo for Phantom/Solflare. No keys,
  seeds, PINs or sessions are placed in the handoff. A custom Solana wallet is not required.
- The sibling service's opt-in immutable receipt links full Solana source signature to the Nexus
  output contract. DEX also verifies the output DEBIT and confirmed, spendable recipient CREDIT.

**Containment:** no deployment is accepted for funding by default. Current-host storage
capability and live cross-repository wallet/node/test-network acceptance remain blockers.
An on-chain listing proves neither operator trust nor solvency. The known service daily-cap
bypass and unrelated repository debt are not fixed by this client or receipt work.


## Repository-State Boundary
- Base HEAD `9ea48d923df7c4463b5a5bd9d7388bf11d87b601` retains `src/components/ErrorBoundary.js`, imports it from `src/App/Main.js`, and has no `scripts.lint` entry.
- The current working implementation adds the lint script, changes `Main` to import `src/App/components/ErrorBoundary.js`, deletes the old tracked path, and leaves the byte-identical destination untracked.
- Build and lint results in the current review therefore describe the dirty working implementation, not an isolated clean-HEAD tree.
- The relocation is architecturally acceptable for an app-shell-only component, but it must be staged explicitly: update/delete staging alone would omit the destination, while broad staging risks including backup/original artifacts.

## Integration with Nexus Wallet
- The module reads wallet data from the `nexus` slice (provided by the Nexus Wallet Redux module).
- Transactions are initiated via `secureApiCall` which triggers the wallet’s PIN prompt.
- On‑chain events are monitored via polling (`fetchMarketData` every 15 seconds) and Redux updates.

## Build System
- Webpack with Babel (`webpack.config.babel.js`, `webpack-dev.config.babel.js`).
- Production build: `npm run build`.
- Development server: `npm run dev`.
- ESLint is exposed as `npm run lint` only by the dirty `package.json`; it is not part of tracked HEAD and fails with 34 errors and 118 warnings.
- A Jest configuration, one test file, and two mocks exist, but `package.json` has no runnable `test` script or Jest dependencies.
- The current dirty-tree production build succeeds, but emits an 846 KiB entry asset and three webpack performance warnings.