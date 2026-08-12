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
- Current suites: `apiCache`, `reducers`, `fetchExecuted`, `marketData` —
  38 tests, all passing, run by CI on every pull request.
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
- JSDoc exists on `utils/apiCache.js`, `utils/apiCallWithRetry.js` and
  `utils/marketData.js`.
- The convention that causes the most bugs here — the bid/ask `contract`/`order`
  amount mapping and the NXS 1e6 divisible-unit rule — is now documented and
  enforced in `utils/marketData.js` (§23). It should still be summarised in
  `ARCHITECTURE.md` so a new contributor meets it before writing a fetch.
- Component props are undocumented; several components take a bare `num` prop
  whose meaning differs between them (row cap vs. page size).

### b. Architecture documentation — ✅ Done
- `ARCHITECTURE.md` present.

### c. Contributing guidelines — ✅ Done
- `CONTRIBUTING.md` present. Now accurate, since the `lint`/`test` commands it
  implies actually exist.

## 8. DevOps & CI/CD

### a. Continuous integration — ✅ Done
- `.github/workflows/ci.yml` runs on every pull request and on pushes to
  `master`: `npm ci` → `npm run lint` → `npm test -- --ci --coverage` →
  `npm run build`, on Node 20 with the npm cache enabled.
- The built `dist/js/app.js` is uploaded as an artifact. `dist/js` is
  gitignored, so this is the only way to inspect the bundle a PR produces.
- In-flight runs are cancelled when a PR is pushed to again
  (`concurrency.cancel-in-progress`).
- This would have caught the broken `useMemo` described in §9a before it
  reached master.
- **Not yet enforced:** ESLint warnings do not fail the run (there are 42, most
  of them in `stablecoinSwap.js`). Once that file is resolved (§20), add
  `--max-warnings 0` to the `lint` script to stop new ones accumulating.
- Possible additions: `npm audit` as a non-blocking step (§4a), and a coverage
  threshold in `jest.config.js` once the suite is broader (§2a).

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

### 23. Executed trades were never normalized — ✅ Done
`fetchExecuted` dispatched the `market/executed` response straight into the
store. Every other consumer of market data — `fetchOrderBook`, `ChartWindow`,
`markets`, `portfolio` — applies the two conventions the core requires, but
nothing downstream of `fetchExecuted` did. On a `TOKEN/NXS` pair (every pair
this module lists) that meant the Overview tab's Last Price, High, Low, Change,
Volume and Market Cap, plus the entire Trade History table, were computed from
the core's known-unreliable `price` field with NXS volumes 1,000,000× too large.

Both rules now live in `src/utils/marketData.js` — the NXS divisible-unit
conversion and the bid/ask `contract`/`order` amount convention — applied by
`fetchExecuted` and `fetchOrderBook` alike and covered by
`__tests__/marketData.test.js`. This also closes the §7a recommendation to
document the convention in one place.

**This is the pattern to watch for.** Both rules are silent: getting them wrong
produces plausible-looking numbers rather than an error. Any new code path that
touches a `market/*` response must go through `normalizeMarketEntries`.

### 24. `fetchExecuted` called an endpoint that does not exist — ✅ Done
Reported from the wallet as *"Cannot get executed transactions — unknown
variable: results.timestamp>since"*. The request disagreed with every other
market call in the module on four points at once:

| | `fetchExecuted` | Every other market call |
| --- | --- | --- |
| endpoint | `market/executed/` | `market/list/executed` |
| market parameter | `marketPair` | `market` |
| filter parameter | `queryString` | `where` |
| filter syntax | ``since(`1 year`)`` | `results.timestamp>1700000000` |

The core's filter engine stopped parsing at the `(`, hence the error naming
`results.timestamp>since` as a variable. `ChartWindow` and `portfolio` both use
numeric Unix timestamps and render real data, so that is the form this core
build accepts.

**The failure was not new — only the popup was.** The previous catch block
called `showErrorDialog('Cannot get executed transactions', error.message)`,
passing two strings where the wallet expects `{ message, note }`, so the dialog
never rendered. Fixing that call (§6c) surfaced a request that had been failing
silently the whole time. The trade history and every Overview figure were
falling back to an empty array.

The same `since()` syntax was in `markets.js` three times, and every one of
those calls has a silent `.catch(() => ({ amount: 0 }))` fallback — so the
Markets tab has been showing **0 volume and 0 last price for every token**, and
the "Top 10 by volume" ranking has been ordering zeros. All three converted.

`market/user/executed` is now fetched separately for the user's own trades: the
public executed list carries no per-user data, so `data.myTrades` — which the
old code passed to `setMyTrades` — was always `undefined`. A failure there is
reported into `myTrades.error` (§12) instead of taking the public history down
with it.

**Two lessons, both already in the roadmap.** A silent `.catch()` that
substitutes a plausible default (`0`) hides a broken request indefinitely —
prefer surfacing a distinguishable "unavailable" state. And endpoint strings and
parameter names duplicated across components drift apart until one of them is
simply wrong; that is the case for **A3**, the API client layer.

---

# Roadmap to a professional DEX module

Everything above is remediation. This section is forward-looking: what separates
the module as it stands from something a serious trader would choose to use.

Items are grouped as **A**rchitecture, **V**isual, **F**unctional, and each is
tagged with rough effort (S/M/L) and whether it is a prerequisite for others.
Nothing here is started.

## A. Architecture

### A1. One polling scheduler instead of five independent intervals — M
Today each component owns an interval: `Main` every 15s (order book + executed
trades), `markets` every 60s, `HoldersList` every 120s, `nftMarketplace` every
30s, `ChartWindow` on market change. Nothing coordinates them.

Consequences: polling continues while a tab is not visible and while the wallet
window is in the background; a node that is down produces an error dialog per
tick per component with no backoff; two components asking for the same data
issue two requests (`apiCache` only helps where it is wired in); and there is no
single place to see whether data is fresh, stale or failing.

Build a subscription layer over `apiCache`: components declare what they need
and at what cadence, one scheduler owns the timers, pauses on
`document.visibilityState === 'hidden'`, de-duplicates in-flight requests, and
backs off exponentially on failure. This is the prerequisite for A2, F5 and V6.

### A2. Key market state by market pair — M
`state.ui.market` holds exactly one pair's data. Switching pairs leaves the
previous pair's order book and trades on screen, correctly rendered but labelled
with the new pair, until the next poll returns — the UI cannot distinguish
"loading" from "this market is empty".

Key the slices by `marketPair` and add an explicit per-market status
(`idle | loading | ready | error | stale`). Every table then renders the right
state instead of inferring it from an empty array. Also enables instant
back-and-forth between recently viewed pairs.

### A3. An API client layer — M
Endpoint strings with inline field projections are scattered across components:
`'market/list/order/txid,owner,price,type,timestamp,contract.amount,...'`. The
projection is part of the contract — §15 was exactly this bug, where a caller
read `token.address` from a projection that returns `ticker,token,balance`.

Introduce `src/api/` with one function per endpoint owning its projection,
normalization and error shape (`listOrders(market)`, `listExecuted(market,
timeSpan)`, `getToken(nameOrAddress)`, …). Components stop knowing endpoint
strings, normalization cannot be forgotten (§23), and the API surface becomes
greppable and mockable in tests.

### A4. Stop doing money maths in binary floats — M, correctness
Every amount, price and total is a JS `number`. `quoteAmount / price` feeds
order creation, and `createOrder` already has to defensively re-round with
`toFixed(baseTokenDecimals)` because of the resulting drift. Floats cannot
represent 0.1 exactly; for an exchange this is a correctness issue, not a
rounding nicety.

Move to integer minor units (amount × 10^decimals as `BigInt`) or `decimal.js`
at the boundaries, converting to display strings only for rendering. Doing this
after A3 means the conversion lives in one layer.

### A5. Expire optimistic state — S
Unconfirmed orders and trades are added on submit and removed only when
reconciliation finds them on chain. A transaction that never confirms leaves a
"⏳ Pending confirmation" row forever. Add a timestamp-based TTL that flags a
pending entry as stale after N blocks/minutes and offers a retry or dismiss.

### A6. Memoized selectors — S
Every component re-derives state with inline arrow selectors, and ~10 of them
repeat the same `state.ui.market.marketPairs.*` block. Add `reselect` and a
`selectors/` module (plus the `useMarketPair()` hook from §6a). Prerequisite for
getting real value out of `React.memo` (§3a).

### A7. Treat the wallet session as a first-class input — S
Nothing reacts to the user logging out, switching sigchain, or the node going
out of sync. `fetchOrderBook`'s fallback fetches `sessions/status/local` but
only inside an error handler. Read session and sync status into the store and
gate order entry on it, rather than letting a trade fail at PIN entry.

## V. Visual design

### V1. Adopt the wallet theme instead of a private palette — M, highest visual impact
`App/index.js` reads `state.nexus.theme` and hands it to `ModuleWrapper`, which
provides it through emotion's `ThemeProvider`. Exactly **one** line in the whole
module consumes it (`styles.js:229`, `theme.primary`). Against that there are
**334 hardcoded hex colours across 16 files** — 98 in `ChartWindow.js`, 44 in
`nftStyles.js`, 29 inline in `portfolio.js`.

A user running a light wallet theme gets a hard-coded dark module bolted into
it. Nothing else in their wallet looks like this. Define a token layer that
derives from the wallet theme, with the trading-specific additions (bid green,
ask red, warning amber) as the only module-owned colours, and replace the hex
literals with tokens. This is the single change that most makes the module look
like part of the product rather than an add-on.

### V2. Numbers that read like an exchange — S, high impact
`formatNumberWithLeadingZeros` handles very small prices elegantly (subscript
zero notation) but the rest is inconsistent: `toFixed(2)` in some branches,
token decimals in others, and **no thousands separators anywhere** — a balance
of 1234567 renders as `1234567.00`.

Adopt one rule set: grouped thousands, significant-figure-based precision per
column, tabular/monospace numerals so digits align vertically down a column, and
the existing subscript notation for sub-threshold prices. Right-align every
numeric column. Cheap, and it is most of the difference between "looks like a
spreadsheet" and "looks like a trading terminal".

### V3. A real order book — M, high impact
Currently a plain three-column table with a 1px grey divider between asks and
bids. Professional order books carry information in the layout itself:

- **Depth bars**: a background bar per row proportional to cumulative size, so
  liquidity is visible at a glance.
- **A spread row** in the middle showing last price, absolute spread and spread
  as a percentage. Note that `overview.js` had `highestBid`/`lowestAsk` state
  that was computed and never rendered — the intent was there, unfinished.
- **Price grouping** selector (1 / 0.1 / 0.01 …), essential once a book has
  many distinct price levels.
- **Direction colouring** on the last trade (up/down tick).

### V4. Consistent table states — S
Empty, loading and error states differ per table: some render "No orders", some
render nothing, some a coloured message, and several have no loading state at
all. One `<TableState kind="empty|loading|error">` component used everywhere,
which also gives every table a skeleton for free (§5a).

### V5. Move `portfolio.js` off inline styles — S
~29 inline style objects, recreated on every render, for what is one table.
Convert to styled-components consistent with the rest, and it picks up V1 and V2
automatically.

### V6. Layout that survives a resized wallet window — M
One media query exists in the entire module (`ResponsiveDualColRow`). The layout
grids in `styles.js` are fixed multi-column and the portfolio summary card sets
`minWidth: 500`. The wallet window is freely resizable. Define breakpoints once
and apply them to the page layouts.

### V7. Density and affordance — S
Row heights differ between the order book and the my-orders table; clickable
rows in Markets, Portfolio and the order book have no consistent hover or
pointer affordance (and no keyboard access — see §5c). Settle one table scale
and apply it.

## F. Functional — trader-facing

### F1. Complete the order ticket — S, highest functional value
The form asks for price and amount and shows nothing else. `baseAmount` is
already computed and never displayed. A professional ticket shows:

- **Total** (price × amount) and what you receive, live as you type
- **Percentage-of-balance buttons** (25 / 50 / 75 / 100%) — the balance is
  already known, since accounts are filtered by it
- **Resulting balance** after the trade
- **Fees**, if the market charges any
- **Validation inline**, not as a modal after submitting

### F2. Click-to-fill from the order book — S
Clicking a price level currently prefills that level only. The convention
traders expect is: click a level to fill price *and* the cumulative size up to
that level, so one click sizes an order that sweeps the book to that price.

### F3. User-set slippage tolerance — S
Market Fill hardcodes a ±10% price-protection band (`marketBestPrice * 1.1`).
Expose it as a setting with a sensible default. Traders will not use a market
order whose protection they cannot see or change.

### F4. Order history, not just open orders — M
There is an open-orders table and a trades table. There is no view of cancelled
or expired orders, so a user cannot answer "what happened to the order I placed
yesterday". Add a history tab backed by `market/user/executed` plus cancellation
records, with CSV export — accounting and tax reporting is a routine
professional requirement.

### F5. Notify on fill — S, high perceived value
`showNotification` is exported by `nexus-module` and unused. Reconciliation in
`fetchOrderBook` already detects the moment a pending order becomes confirmed or
a trade appears — that is exactly where a "your order filled" notification
belongs. With A1 in place this works even when the module is not the visible
tab.

### F6. Support non-NXS quote pairs throughout — M
The market pair model supports any base/quote, but several paths hardcode NXS:
`markets.js` `handleClick` builds `${ticker}/NXS`, `toggleWatchlist` stores
`${ticker}/NXS`, and the Markets tables label every column "NXS". Token/token
markets therefore cannot be reached from Markets or saved to a watchlist.

### F7. Show your own orders on the depth chart — S
The Market Depth tab draws aggregate liquidity but not the user's position in
it. Markers at your own price levels turn the chart from an information display
into a decision tool. The data is already in the store (`myOrders`).

### F8. Persist chart drawings and settings — S
`ChartWindow` keeps drawings, indicators, chart type, interval and log/linear in
local state, and the Chart tab unmounts on tab switch — so everything is lost on
every navigation. Persist to `settings` (already written to disk) or, following
the watchlist precedent, to an on-chain asset.

### F9. Average entry price per holding — S
`portfolio.js` computes total P&L but not average entry, and its cost-basis
logic carries a comment noting uncertainty about the market orientation of
`market/user/executed`. Verify that orientation against a real account, then
surface average entry alongside P&L — it is the number holders actually look
for.

### F10. Deeper books with grouping — S
`fetchOrderBook` requests `limit: 100` and components render `num` rows. Combined
with V3's price grouping, raise the limit and aggregate, so the displayed book
reflects real market depth rather than an arbitrary cut.

### F11. Keyboard shortcuts — S
Focus amount/price, submit bid, submit ask, cancel-all, switch pair. Cheap once
V7's focus states exist, and expected by anyone trading seriously.

## Suggested sequencing

Ordered so each phase makes the next cheaper, rather than by raw value.

| Phase | Items | Rationale |
| --- | --- | --- |
| 1. Foundation | A3, A6, V1, V2 | An API layer and selectors before new features; theme tokens and number formatting before any new UI, so nothing new has to be restyled later |
| 2. Trading core | F1, F2, F3, V3, V4 | The order ticket and order book are what a trader actually uses; these four are the bulk of the perceived quality jump |
| 3. Reliability | A1, A2, A5, A7 | Polling, per-market state and session awareness — invisible when working, and the source of most "it showed me the wrong thing" reports |
| 4. Depth | F4, F5, F7, F8, F9, F10 | History, notifications and chart persistence, once the foundation carries them |
| 5. Correctness | A4 | Decimal handling is the most invasive change; do it deliberately, after A3 has centralised the boundaries |
| Ongoing | V5, V6, V7, F6, F11 | Incremental, parallelisable, no dependencies |

**If only three things are done:** V1 (adopt the wallet theme), F1 (complete the
order ticket), V3 (a real order book). Those three change what the module *is*
to a user; almost everything else changes how well it holds up.

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

This covers the remediation items (§1–§23). For the forward-looking work see
[Suggested sequencing](#suggested-sequencing) in the roadmap above — the two
lists are independent, and the roadmap's Phase 1 can start in parallel.

**Highest value:**
1. Tests for `fetchOrderBook`'s fallback (§22) and for `placeOrder`'s validation
   branches. CI runs the suite on every PR now, so each new test permanently
   protects a path — and §23 showed that a silent normalization bug can sit in
   the most-read numbers in the UI indefinitely.
2. Summarise the `contract`/`order` and NXS 1e6 conventions in `ARCHITECTURE.md`,
   pointing at `utils/marketData.js` as the enforcement point (§7a, §23).
3. Resolve `stablecoinSwap.js` (§20), then turn on `--max-warnings 0` in the
   `lint` script so CI holds the line on warnings too (§8a).

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
actions, reducers and components. The main risk it carried was not architectural —
it was that several of the "improvements" recorded here were never actually in the
tree, and one of them (the `useMemo` in `TradeForm`) shipped a crash to master.
CI now runs lint, tests and the build on every pull request, which is the single
change that most reduces the chance of that recurring: from here on, a status
check is the source of truth for what this document may claim.

The fork referenced by the original document: https://github.com/distordialabs-brutus/DEX
