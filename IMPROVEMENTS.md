# Suggested Improvements for AkstonCap/DEX Module

Status of each item below was re-verified against the working tree (not against
commit messages) on the `claude/bug-fixes-improvements-review-pjnx9k` branch.
Several items in the previous revision of this file were marked "Implemented"
for components and tests that do not exist in the repository — those have been
corrected, and the artefacts they referred to are listed under
[Corrections to previous claims](#corrections-to-previous-claims).

**Legend** — ✅ Done · 🟡 Partial · ❌ Not started · ❓ Not assessed

---

## 1. Code Quality & Maintainability

### a. Linting and formatting — ✅ Done
- `.eslintrc.json` present, now with `root`, `ignorePatterns`, a `jest` env
  override for test files, and `eslint-plugin-react-hooks`.
- `npm run lint` / `npm run lint:fix` scripts added (previously the config
  existed but there was no way to run it from npm).
- Prettier config (`.prettierrc`) present; no `format` script yet.
- `src` currently lints clean of errors; remaining output is warnings.

### b. TypeScript support — ❌ Not started
- 60+ `.js`/JSX files, 0 TypeScript files. `tsconfig.json` exists but only sets
  `allowJs`/`noEmit` and nothing consumes it.
- Blocker to be aware of: `src/components/solanaProvider.js` already contains
  TypeScript syntax (`interface`, `FC<Props>`) in a `.js` file. It is dead code,
  imports packages that are not in `package.json`, and cannot be parsed by the
  Babel config — it is currently excluded from linting. Delete it or convert the
  project properly.

### c. File organization — 🟡 Partial
- `actions/`, `components/`, `reducers/`, `utils/`, `App/` separation exists.
- Container vs. presentational components are still mixed; `App/markets.js`,
  `App/portfolio.js` and `App/stablecoinSwap.js` each hold layout, data fetching
  and styled-components in one file.
- Constants (cache TTLs, default market pair, watchlist asset name) are declared
  ad hoc per file.

## 2. Testing & Reliability

### a. Unit test coverage — 🟡 Partial
- `npm test` works now (`jest`, `babel-jest`, `jest-environment-jsdom` and
  `identity-obj-proxy` were missing from `package.json`, so the existing
  `jest.config.js` and test file could not run at all).
- Current suites: `__tests__/apiCache.test.js`, `__tests__/reducers.test.js`,
  `__tests__/fetchExecuted.test.js` — 20 tests, all passing.
- The `nexus-module` mock now exports named bindings; it previously only had a
  default export, so any component test would have received `undefined` for
  `apiCall`, `showErrorDialog`, etc.
- Still untested: `TradeForm`, `OrderBookComp`, `placeOrder`, `fetchOrderBook`,
  `nftActions`, and all rendering.

### b. Integration tests — ❌ Not started
- No coverage of the order placement / cancellation / execution flows end to end.
- Recommend `@testing-library/react` for the flows and, if a wallet harness is
  available, a smoke test against a testnet node.

## 3. Performance Optimization

### a. Re-render optimization — 🟡 Partial
- `useMemo`/`useCallback` are used in `TradeForm`, `ChartWindow`, `DepthChart`,
  `OrderBookComp`, `BidBook`, `AskBook`, `markets`.
- `React.memo` is used **nowhere** in the codebase (the previous revision claimed
  it was "used where appropriate").
- Good candidates: `TradeHistory`, `PersonalTradeHistory`, `PersonalOpenOrders`,
  `NFTCard` — all pure renderers driven by props/selectors.

### b. Virtual scrolling — ❌ Not started
- There is no `VirtualizedTable` component and no virtualization anywhere; the
  previous revision claimed this was implemented.
- Row counts are currently capped instead (`num` props, `slice(0, num)`), which
  bounds the DOM but also hides data. The full-token table in Markets renders up
  to 20 rows × 9 columns and the holders list up to 100 entries.

### c. API call optimization — 🟡 Partial
- `utils/apiCache.js` (TTL cache) is used by `markets.js`, `portfolio.js` and
  `nftActions.js`.
- `utils/apiCallWithRetry.js` (exponential backoff) is used by `fetchExecuted`
  **only** — `fetchOrderBook`, `fetchTokenAttributes` and `placeOrder` still call
  `apiCall` directly.
- `TradeForm` no longer refetches the account list on every keystroke; the raw
  lists are fetched per market/order-method and filtered in a memo.
- Known gap: `getCached` returns `null` both for "not cached" and for a cached
  `null`, so a legitimately empty response is never served from cache.

## 4. Security Enhancements

### a. Dependency security — ❌ Not started
- No `npm audit` step, no Dependabot/Snyk configuration.

### b. Input validation & sanitization — 🟡 Partial
- `placeOrder.js` validates required fields, account token type and balance
  before submitting; `nftActions.js` validates supply/decimals and enforces the
  1 KB asset payload limit.
- Numeric fields still accept whatever the wallet's `TextField` yields; amounts
  are coerced with `parseFloat` at the edges rather than validated centrally.
- No HTML is rendered from user or chain data (no `dangerouslySetInnerHTML`), so
  the injection surface is small. NFT `image_url` values are rendered as `<img
  src>` from arbitrary remote origins — worth a scheme allow-list.

### c. Secure storage — ❓ Not assessed
- The module persists only `settings` to disk and a filtered `ui` slice to the
  session. Neither contains credentials — the wallet owns PIN handling via
  `secureApiCall`. No `localStorage`/`sessionStorage` use in `src`.

## 5. User Experience Improvements

### a. Loading states & skeletons — 🟡 Partial
- There is no `DataLoadingState` component (previously claimed).
- Inline loading states exist in `HoldersList`, `ChartWindow`, `markets`
  (watchlist), `nftMarketplace`, and now `TradeForm` (account fetch).
- Missing on: order book, trade history, depth chart, portfolio.
- No skeleton screens anywhere.

### b. Error boundaries — ✅ Done
- `components/ErrorBoundary.js` wraps `Main`, so every tab is covered, with a
  "Try again" reset.
- Possible follow-up: a per-tab boundary so one broken tab does not blank the
  whole panel.

### c. Accessibility — ❌ Not started
- No ARIA roles/labels. Clickable `<tr>` elements in the order book, markets and
  portfolio tables are not keyboard reachable and have no `role="button"`.
- Several controls are colour-only (bid green / ask red).

### d. Mobile responsiveness — 🟡 Partial
- One media query exists (`ResponsiveDualColRow` in `markets.js`).
- The layout grids in `components/styles.js` are fixed multi-column; the
  portfolio summary card has `minWidth: 500`, which will overflow narrow views.

## 6. Architecture & Best Practices

### a. Custom hooks — 🟡 Partial
- Two exist: `useCancelOrder` (`DeleteButton.js`) and `useRefreshMarket`
  (`RefreshButton.js`). The previous revision said "no evidence of custom hooks".
- The repeated `useSelector(state => state.ui.market.marketPairs.*)` block
  appears in ~10 components and is the obvious candidate for a `useMarketPair()`
  hook.

### b. State management optimization — ❌ Not started
- Plain Redux with hand-written action creators and reducers; no Redux Toolkit.
- Selectors are inline arrow functions, so no memoized selector layer.
- The store is not normalized — orders are stored as raw API payloads.
- The persistence selectors in `configureStore.js` are now memoized on their
  source slice; before, they rebuilt a new object on every call, which made
  nexus-module's reference comparison always fail and wrote state to disk / IPC
  on **every dispatched action**.

### c. Error handling — 🟡 Partial
- `ErrorBoundary` + `apiCallWithRetry` are in place.
- The dialog helpers were being `dispatch()`ed as if they were action creators.
  They are plain utilities that return `undefined`, so every one of those calls
  threw "Actions must be plain objects" from inside a `catch` block, replacing
  the intended error dialog with a second, unhandled error. Fixed in 12 places.
- Still no circuit breaker; a node that is down produces a dialog per poll.

## 7. Documentation

### a. Inline documentation — 🟡 Partial
- JSDoc exists on `utils/apiCache.js` and `utils/apiCallWithRetry.js`.
- The non-obvious parts — the bid/ask `contract`/`order` amount convention, and
  the NXS 1e6 divisible-unit normalization — are now commented where they are
  applied, but are not documented in one place. That convention is the single
  biggest source of bugs in this codebase and deserves a section in
  `ARCHITECTURE.md`.

### b. Architecture documentation — ✅ Done
- `ARCHITECTURE.md` present.

### c. Contributing guidelines — ✅ Done
- `CONTRIBUTING.md` present. Now accurate, since the `lint`/`test` commands it
  implies actually exist.

## 8. DevOps & CI/CD

### a. Continuous integration — ❌ Not started
- `.github/` contains only `copilot-instructions.md`; there are no workflows.
- Now worth doing, because `npm run lint`, `npm test` and `npm run build` all
  work: a workflow running the three on PRs would have caught the broken
  `useMemo` described below before it reached master.

### b. Automated releases — ❌ Not started
- Versions in `package.json` and `nxs_package.json` (0.4.2) are bumped by hand
  and can drift apart. No changelog.

## 9. Specific Code Observations

### a. TradeForm.js — 🟡 Partial
- The memoization added previously introduced
  `const formattedQuoteToken = useMemo(() => formattedQuoteToken, [quoteToken])`
  — the factory returns the `const` it is being assigned to, so it threw a
  temporal-dead-zone `ReferenceError` on first render and took the entire Trading
  Desk tab down. Fixed to call `formatTokenName`.
- Nine `useCallback` handlers were created but never wired into the JSX, which
  kept inline arrow handlers on every input. The useful ones are now attached and
  the redundant ones removed.
- The account-fetch effect depended on the whole `orderInQuestion` object plus
  `quoteAmount`/`baseAmount`, so it fired two API calls per keystroke with no
  cancellation. Split into a fetch effect (per market/order method, with a
  cancellation guard) and a filtering memo.
- `accountsLoading` was declared but never set or read; it now drives a status
  line under the account selectors.
- Remaining: the component is ~780 lines and still mixes market-fill logic,
  order-execution logic and a hand-rolled modal. Extracting the confirmation
  modal and the market-fill "best order" search would be the next step.

### b. OrderBookComp.js — 🟡 Partial
- `aggregateOrdersByPrice` is now memoized (in `OrderBookComp`, `BidBook` and
  `AskBook`).
- Unused `Modal` import, unused `orderSelectionDialog` state and an unreachable
  `handleOrderSelect` were removed.
- Not virtualized (see 3b). Rows are still keyed by array index, so keys shift
  whenever a price level appears or disappears.

### c. DepthChart.js — 🟡 Partial
- Both sides now accumulate depth in **base** token. Asks previously used
  `order.amount`, which is the *quote* amount for an ask, so the ask curve was
  plotted in different units from the bid curve on a shared axis.
- The footer label read "Spread" while showing the mid price; corrected.
- Remaining: on a log scale a zero or near-zero best bid produces an infinite
  ratio in the domain calculation.

### d. ChartWindow.js — 🟡 Partial
- `calculateEMA` indexed past the end of the array when there were fewer candles
  than the indicator period, throwing on `data[period - 1].time`; both SMA and
  EMA now return empty early.
- Drawing cleanup called `chart.removeSeries()` on `{ type, line }` wrapper
  objects, which always threw, so old drawings were never removed and stacked up.
  Handles are now tracked in a ref and removed by kind.
- Tiles labelled "24H VOLUME" and "N Days" ignored the selected interval; they
  now report the interval they actually describe.
- Remaining: the OHLC loop always walks a full 5 years at the selected interval
  regardless of the selected range (up to ~44k iterations at `1h`).

## 10. Build & Deployment

### a. Bundle analysis — ❌ Not started
- Production build emits a single `app.js` of ~635 KiB, over webpack's 244 KiB
  advisory, and the build warns about it on every run.
- `victory`, `highcharts`, `lightweight-charts`, `@solana/web3.js` and
  `@solana/spl-token` are all in `dependencies`. Both `highcharts` and the Solana
  packages are only reachable from the disabled Stablecoin Swap tab.

### b. Asset optimization — ❌ Not started
- `dist/` ships SVGs unoptimized (`distordia-large.svg` is 13 KB). No lazy
  loading; the NFT grid loads every remote image eagerly.

---

## Newly identified improvements

Items found while fixing the bugs above that were not on the previous list.

### 11. Persisted state must tolerate schema changes — ✅ Done
The root reducer merged `storageData` and `moduleState` into state with a shallow
spread, so a snapshot saved by an older version replaced the whole `ui` slice and
any reducer key added since was simply gone. A user upgrading from a build
without the NFT tab would land on `state.ui.nft === undefined` and crash on
`state.ui.nft.listings`. The same applied to the order slices that
`configureStore` deliberately strips from session state. Now merged recursively,
with regression tests in `__tests__/reducers.test.js`. **Any future reducer added
under `ui` depends on this.**

### 12. Reducers must carry the fields components read — ✅ Done
`PersonalOpenOrders` and `PersonalTradeHistory` both render an error banner from
`myOrders.error` / `myTrades.error`, but neither reducer stored an `error` key,
so the banners were unreachable and a failed fetch showed "No orders" instead.
`fetchOrderBook` also reconciled pending trades against
`state.ui.market.myTrades.trades`, but the reducer stores that list as
`executed` — so the lookup always saw an empty array and confirmed trades were
never cleared from the pending list.

**Recommendation:** the store shape is only described by the reducers themselves.
Either adopt Redux Toolkit (which makes the shape explicit) or add a short state
shape reference to `ARCHITECTURE.md`.

### 13. Do not sort arrays that are already in state — ✅ Done
`markets.js` called `.sort()` in place on the array it had just passed to
`setTokenList`/`setSearchResults`, mutating rendered state behind React's back.
Sorting now happens on copies. Worth a lint rule or a review checklist item —
`.sort()` and `.reverse()` mutate.

### 14. Derive filtered views instead of storing them — ✅ Done
`searchResults` was React state recomputed only when `search` changed, so the 60
second market refresh overwrote it with the unfiltered list and silently cleared
the user's search. It is now a `useMemo` over `tokenList` + `search`.

### 15. Field-name drift between API selectors and consumers — ✅ Done
`portfolio.js` requested `finance/list/account/ticker,token,balance` and then
read `token.address`, which that projection does not return, so clicking a
portfolio row set a market pair with an `undefined` base token address. The
register address is `token.token`.

**Recommendation:** the API field projection is part of the contract. When
changing the field list in an endpoint string, grep for every consumer.

### 16. Optional-chaining checks that do not actually guard — ✅ Done
`fetchOrderBook` used `if (data1.bids?.length !== 0)`, which is `true` when
`bids` is `undefined` and then fell straight through to `data1.bids.forEach`.
The core omits the key entirely when a side is empty. Prefer `Array.isArray(x)`
over `x?.length` comparisons for this shape of check.

### 17. Silent failure paths — ✅ Done
`RefreshButton` returned without any feedback when a token could not be resolved,
so typing an unknown ticker looked like nothing happened. It now reports which
token was not found.

### 18. Unreachable branches in long if/else chains — ✅ Done
`fetchExecuted` mapped time spans through a 12-branch `if/else if` chain that
tested `timeSpan === '1m'` twice; the second ("1 minute") branch was dead, and
the `all` option offered in the Overview dropdown was never handled and silently
became one year. Replaced with a lookup table. ESLint's `no-dupe-else-if` catches
this class of bug and is now running.

### 19. Debug logging left in the render path — ✅ Done
`TradeForm` called `console.log` seven times inside its JSX (which also renders
`undefined` into the output), `HoldersList` logged six times per two-minute poll,
and a reducer logged on every removal. Removed. `no-console` is enabled as a
warning; consider promoting it to an error for `src/`.

### 20. Retire or finish the disabled Stablecoin Swap tab — ❌ Not started
`src/App/stablecoinSwap.js` is 1,300 lines behind a commented-out tab. It carries
the `@solana/*` dependencies into the bundle, uses loose equality in ~10 places,
and had 16 silently-swallowed catch blocks (now annotated). Either finish it on a
branch or remove it and its dependencies from `master`.

### 21. Remove the dead `solanaProvider.js` — ❌ Not started
TypeScript syntax in a `.js` file, importing three `@solana/wallet-adapter-*`
packages that are not dependencies. Nothing imports it. It is excluded from
linting so it does not block CI, but it will break the build the moment someone
imports it.

### 22. `market/user/order` fallback deserves a test — ❌ Not started
`fetchOrderBook` has a non-trivial fallback that reconstructs the user's orders
from the public order book by matching `owner` against the session genesis, with
an `alreadyNormalized` flag so the NXS 1e6 conversion is not applied twice. That
double-normalization would silently mis-price every order by 10^6. It is the
highest-value untested path in the codebase.

---

## Corrections to previous claims

The previous revision of this file recorded these as implemented. None of them
exist in the repository at any commit on this branch:

| Claimed | Reality |
| --- | --- |
| Tests for `DataLoadingState`, `marketStatus`, `tradeValidation`, `virtualization`, `VirtualizedTable` | Only `__tests__/apiCache.test.js` existed — and it could not run, because `jest` was never added to `package.json` |
| `VirtualizedTable` component created and used for order books and trade histories | No such component; no virtualization anywhere |
| `DataLoadingState` component added | No such component |
| `React.memo` used where appropriate | Zero usages |
| ESLint "lint script in package.json" | Config existed, script did not |
| "No evidence of custom hooks" | `useCancelOrder` and `useRefreshMarket` both exist |
| Error handling "Implemented" | The standardized path was throwing a second error inside every `catch` |

---

## Implementation priority

**Now unblocked (highest value):**
1. Add a GitHub Actions workflow running `npm run lint`, `npm test`, `npm run
   build` on PRs (§8a) — the lint/test/build commands all work now.
2. Tests for `fetchOrderBook`'s fallback and normalization (§22) and for
   `placeOrder`'s validation branches.
3. Document the `contract`/`order` amount convention and the NXS 1e6 rule in
   `ARCHITECTURE.md` (§7a).

**Medium:**
4. `React.memo` + a `useMarketPair()` hook (§3a, §6a).
5. Route the remaining fetch thunks through `apiCallWithRetry` (§3c).
6. Decide the fate of Stablecoin Swap and `solanaProvider.js` (§20, §21), then
   re-measure the bundle (§10a).
7. Dependency auditing (§4a).

**Lower:**
8. Virtualization, once row counts justify it (§3b).
9. Accessibility pass on the clickable table rows (§5c).
10. Gradual TypeScript migration (§1b).
11. Redux Toolkit migration (§6b).

## Conclusion

The module has a sound React/Redux structure and clean separation between
actions, reducers and components. The main risk it carries is not architectural —
it is that several of the "improvements" recorded here were never actually in the
tree, and one of them (the `useMemo` in `TradeForm`) shipped a crash to master.
CI running the now-working lint and test commands is the single change that most
reduces the chance of that recurring.

The fork referenced by the original document: https://github.com/distordialabs-brutus/DEX
