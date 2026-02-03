# DEX Application State Machine Diagrams

This document contains state machine diagrams for the Distordia DEX Module, illustrating the various state transitions and flows within the application.

## Table of Contents
1. [Application Overview](#application-overview)
2. [Tab Navigation State Machine](#tab-navigation-state-machine)
3. [Order Lifecycle State Machine](#order-lifecycle-state-machine)
4. [Trade Execution State Machine](#trade-execution-state-machine)
5. [Order Cancellation State Machine](#order-cancellation-state-machine)
6. [Market Data State Machine](#market-data-state-machine)
7. [Watchlist State Machine](#watchlist-state-machine)
8. [Chart Features State Machine](#chart-features-state-machine)
9. [Redux State Structure](#redux-state-structure)

---

## Application Overview

The DEX application uses Redux for state management with the following main state slices:
- `ui.activeTab` - Current navigation tab
- `ui.market` - Market-related data (order book, pairs, orders, trades)
- `settings` - User settings (timespan, etc.)
- `nexus` - Wallet data from Nexus module

---

## Tab Navigation State Machine

```
                                    ┌─────────────────────────────────────────────────────────────┐
                                    │                     SWITCH_TAB                              │
                                    ▼                                                             │
┌─────────────┐  SWITCH_TAB   ┌─────────────┐  SWITCH_TAB   ┌─────────────┐  SWITCH_TAB   ┌───────┴─────┐
│  Overview   │◄─────────────►│    Trade    │◄─────────────►│    Chart    │◄─────────────►│ MarketDepth │
│  (default)  │               │             │               │             │               │             │
└─────────────┘               └─────────────┘               └─────────────┘               └─────────────┘
      ▲                             ▲                             ▲                             ▲
      │                             │                             │                             │
      │         SWITCH_TAB          │         SWITCH_TAB          │         SWITCH_TAB          │
      │                             │                             │                             │
      ▼                             ▼                             ▼                             ▼
┌─────────────┐               ┌─────────────┐               ┌─────────────┐
│   Markets   │◄─────────────►│  Portfolio  │◄─────────────►│ Stablecoin  │
│             │  SWITCH_TAB   │             │  SWITCH_TAB   │    Swap     │
└─────────────┘               └─────────────┘               └─────────────┘

States: Overview | Trade | Chart | MarketDepth | Markets | Portfolio | StablecoinSwap
Initial State: Overview
Trigger: switchTab(tab) action
```

---

## Order Lifecycle State Machine

This diagram shows the complete lifecycle of an order from creation to completion.

```
                                         ┌──────────────────┐
                                         │                  │
                                         │   No Order       │
                                         │   (Initial)      │
                                         │                  │
                                         └────────┬─────────┘
                                                  │
                                                  │ User initiates createOrder()
                                                  ▼
                                         ┌──────────────────┐
                                         │                  │
                                         │   Validating     │
                                         │   Parameters     │
                                         │                  │
                                         └────────┬─────────┘
                                                  │
                           ┌──────────────────────┼──────────────────────┐
                           │                      │                      │
                           ▼                      ▼                      ▼
               ┌────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
               │ Missing Parameters │ │  Wrong Token Type  │ │Insufficient Balance│
               │      ERROR         │ │       ERROR        │ │       ERROR        │
               └────────────────────┘ └────────────────────┘ └────────────────────┘
                           │                      │                      │
                           └──────────────────────┼──────────────────────┘
                                                  │
                                                  ▼
                                         ┌──────────────────┐
                                         │  Show Error      │
                                         │  Dialog          │
                                         │  Return null     │
                                         └──────────────────┘

                              (If validation passes)
                                         │
                                         ▼
                                ┌──────────────────┐
                                │                  │
                                │  secureApiCall   │
                                │  (market/create) │
                                │                  │
                                └────────┬─────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
        ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
        │  User Cancelled │   │  API Error      │   │  Success        │
        │  (return null)  │   │  Show Error     │   │                 │
        └─────────────────┘   └─────────────────┘   └────────┬────────┘
                                                             │
                                                             ▼
                                                   ┌─────────────────┐
                                                   │                 │
                                                   │  Unconfirmed    │
                                                   │  Order          │◄─── ADD_UNCONFIRMED_ORDER
                                                   │  (Pending)      │
                                                   │                 │
                                                   └────────┬────────┘
                                                            │
                                                            │ Blockchain confirms
                                                            │ (detected by fetchMarketData)
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │                 │
                                                   │  Confirmed      │◄─── REMOVE_UNCONFIRMED_ORDER
                                                   │  Order          │     SET_MY_ORDERS
                                                   │  (Active)       │
                                                   │                 │
                                                   └────────┬────────┘
                                                            │
                              ┌─────────────────────────────┼─────────────────────────────┐
                              │                             │                             │
                              ▼                             ▼                             ▼
                    ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
                    │                 │           │                 │           │                 │
                    │   Executed      │           │   Cancelled     │           │  Partially      │
                    │   (Filled)      │           │                 │           │  Filled         │
                    │                 │           │                 │           │                 │
                    └─────────────────┘           └─────────────────┘           └─────────────────┘
```

---

## Trade Execution State Machine

This diagram shows the flow when a user executes an existing order.

```
                                    ┌─────────────────────┐
                                    │                     │
                                    │   Idle              │
                                    │   (Order Selected)  │
                                    │                     │
                                    └──────────┬──────────┘
                                               │
                                               │ User clicks Execute
                                               │ executeOrder(txid, from, to, amounts)
                                               ▼
                                    ┌─────────────────────┐
                                    │                     │
                                    │   Validating        │
                                    │   Inputs            │
                                    │                     │
                                    └──────────┬──────────┘
                                               │
                        ┌──────────────────────┼──────────────────────┐
                        │                      │                      │
                        ▼                      │                      ▼
            ┌───────────────────┐              │          ┌───────────────────┐
            │ Missing Params    │              │          │ Validation OK     │
            │ Show Error        │              │          │                   │
            │ Return null       │              │          └─────────┬─────────┘
            └───────────────────┘              │                    │
                                               │                    ▼
                                               │          ┌───────────────────┐
                                               │          │ Fetching Order    │
                                               │          │ Information       │
                                               │          │ (market/list/     │
                                               │          │  order)           │
                                               │          └─────────┬─────────┘
                                               │                    │
                                               │     ┌──────────────┴──────────────┐
                                               │     │                             │
                                               ▼     ▼                             ▼
                                    ┌───────────────────┐              ┌───────────────────┐
                                    │ Order Not Found   │              │ Order Found       │
                                    │ Show Error        │              │ Validate Accounts │
                                    └───────────────────┘              └─────────┬─────────┘
                                                                                 │
                              ┌──────────────────────────────────────────────────┤
                              │                              │                   │
                              ▼                              ▼                   ▼
                  ┌───────────────────┐         ┌───────────────────┐ ┌───────────────────┐
                  │ Wrong Token Type  │         │ Insufficient      │ │ Accounts Valid    │
                  │ Show Error        │         │ Balance           │ │                   │
                  └───────────────────┘         │ Show Error        │ └─────────┬─────────┘
                                                └───────────────────┘           │
                                                                                ▼
                                                                    ┌───────────────────┐
                                                                    │                   │
                                                                    │  secureApiCall    │
                                                                    │  (market/execute/ │
                                                                    │   order)          │
                                                                    │                   │
                                                                    └─────────┬─────────┘
                                                                              │
                                          ┌───────────────────────────────────┼───────────────┐
                                          │                                   │               │
                                          ▼                                   ▼               ▼
                              ┌───────────────────┐               ┌───────────────────┐ ┌───────────────┐
                              │ No Response       │               │ Success = false   │ │ Success       │
                              │ Show Error        │               │ Show Error        │ │               │
                              └───────────────────┘               └───────────────────┘ └───────┬───────┘
                                                                                                │
                                                                                                ▼
                                                                                    ┌───────────────────┐
                                                                                    │                   │
                                                                                    │ Unconfirmed Trade │
                                                                                    │ (Pending)         │◄─ ADD_UNCONFIRMED_TRADE
                                                                                    │                   │
                                                                                    └─────────┬─────────┘
                                                                                              │
                                                                                              │ Blockchain confirms
                                                                                              ▼
                                                                                    ┌───────────────────┐
                                                                                    │                   │
                                                                                    │ Confirmed Trade   │◄─ REMOVE_UNCONFIRMED_TRADE
                                                                                    │ (Complete)        │   SET_MY_TRADES
                                                                                    │                   │
                                                                                    └───────────────────┘
```

---

## Order Cancellation State Machine

```
                              ┌─────────────────────┐
                              │                     │
                              │   Active Order      │
                              │   (Confirmed)       │
                              │                     │
                              └──────────┬──────────┘
                                         │
                                         │ User clicks Cancel
                                         │ cancelOrder(txid)
                                         ▼
                              ┌─────────────────────┐
                              │                     │
                              │  secureApiCall      │
                              │  (market/cancel/    │
                              │   order)            │
                              │                     │
                              └──────────┬──────────┘
                                         │
                  ┌──────────────────────┼──────────────────────┐
                  │                      │                      │
                  ▼                      ▼                      ▼
      ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
      │ No Response       │  │ Success = false   │  │ Success           │
      │ Show Error        │  │ Show Error        │  │                   │
      └───────────────────┘  └───────────────────┘  └─────────┬─────────┘
                                                              │
                                                              │ ADD_CANCELLING_ORDER
                                                              ▼
                                                  ┌───────────────────┐
                                                  │                   │
                                                  │  Cancelling       │
                                                  │  (Pending)        │
                                                  │                   │
                                                  └─────────┬─────────┘
                                                            │
                                                            │ Blockchain confirms
                                                            │ (detected by fetchMarketData)
                                                            ▼
                                                  ┌───────────────────┐
                                                  │                   │
                                                  │  Cancelled        │◄─ REMOVE_CANCELLING_ORDER
                                                  │  (Complete)       │   Order removed from myOrders
                                                  │                   │
                                                  └───────────────────┘
```

---

## Market Data State Machine

Shows the periodic refresh cycle for market data.

```
                              ┌─────────────────────────┐
                              │                         │
                              │   App Mounted           │
                              │   (useEffect)           │
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           │ Initial fetch
                                           ▼
                    ┌─────────────────────────────────────────────┐
                    │                                             │
              ┌─────┴─────┐                                 ┌─────┴─────┐
              │           │                                 │           │
              ▼           │                                 ▼           │
    ┌───────────────┐     │                       ┌───────────────┐     │
    │ fetchMarket   │     │                       │ refreshMarket │     │
    │ Data()        │     │                       │ ()            │     │
    │               │     │                       │               │     │
    └───────┬───────┘     │                       └───────┬───────┘     │
            │             │                               │             │
            ▼             │                               ▼             │
    ┌───────────────┐     │                       ┌───────────────┐     │
    │ SET_ORDER_    │     │                       │ SET_MARKET_   │     │
    │ BOOK          │     │                       │ PAIR          │     │
    │               │     │                       │ (token attrs) │     │
    │ SET_EXECUTED_ │     │                       │               │     │
    │ ORDERS        │     │                       └───────────────┘     │
    │               │     │                               │             │
    │ SET_MY_ORDERS │     │                               │             │
    │               │     │                               │             │
    │ SET_MY_TRADES │     │                               │             │
    │               │     │                               │             │
    │ Sync          │     │                               │             │
    │ Unconfirmed   │     │                               │             │
    │ Orders/Trades │     │                               │             │
    └───────┬───────┘     │                               │             │
            │             │                               │             │
            └─────────────┴───────────────────────────────┴─────────────┘
                                           │
                                           │ Wait 15 seconds
                                           │ (setInterval)
                                           │
                                           └────────────────────────┐
                                                                    │
                    ┌───────────────────────────────────────────────┘
                    │
                    │ On marketPair or timeSpan change:
                    │ Clear interval, restart cycle
                    ▼
              ┌───────────────┐
              │               │
              │ App Unmounted │
              │ clearInterval │
              │               │
              └───────────────┘
```

---

## Watchlist State Machine

The watchlist allows users to save favorite market pairs on-chain using a raw asset.

### Watchlist Initialization

```
                              ┌─────────────────────────┐
                              │                         │
                              │   Component Mounted     │
                              │   loadWatchlist()       │
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           │ apiCall('assets/get/raw')
                                           ▼
                              ┌─────────────────────────┐
                              │                         │
                              │   Loading               │
                              │   (watchlistLoading)    │
                              │                         │
                              └────────────┬────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
        │  Asset Not      │    │  Parse Error    │    │  Asset Found    │
        │  Found          │    │  (invalid JSON) │    │  (valid data)   │
        │                 │    │                 │    │                 │
        │  watchlist      │    │  watchlist      │    │  watchlist      │
        │  Exists: false  │    │  Exists: true   │    │  Exists: true   │
        │  watchlist: []  │    │  watchlist: []  │    │  watchlist: [...│
        └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Watchlist Creation

```
                              ┌─────────────────────────┐
                              │                         │
                              │   No Watchlist          │
                              │   (watchlistExists      │
                              │    = false)             │
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           │ User clicks "Create Watchlist"
                                           ▼
                              ┌─────────────────────────┐
                              │                         │
                              │   secureApiCall         │
                              │   ('assets/create/raw') │
                              │                         │
                              │   Shows PIN modal       │
                              │                         │
                              └────────────┬────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
        │  User           │    │  API Error      │    │  Success        │
        │  Cancelled      │    │                 │    │                 │
        │                 │    │  showError      │    │  showSuccess    │
        │  (no change)    │    │  Dialog         │    │  Dialog         │
        └─────────────────┘    └─────────────────┘    └────────┬────────┘
                                                               │
                                                               ▼
                                                   ┌─────────────────┐
                                                   │                 │
                                                   │  Watchlist      │
                                                   │  Created        │
                                                   │                 │
                                                   │  watchlist      │
                                                   │  Exists: true   │
                                                   │  watchlist: []  │
                                                   │                 │
                                                   └─────────────────┘
```

### Toggle Watchlist Item

```
                              ┌─────────────────────────┐
                              │                         │
                              │   Watchlist Exists      │
                              │   User clicks ☆ or ⭐   │
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           │ toggleWatchlist(ticker)
                                           ▼
                              ┌─────────────────────────┐
                              │                         │
                              │   Compute new list      │
                              │   - If in list: remove  │
                              │   - If not: add         │
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           │ secureApiCall('assets/update/raw')
                                           ▼
                              ┌─────────────────────────┐
                              │                         │
                              │   Updating              │
                              │   (watchlistUpdating    │
                              │    = true)              │
                              │                         │
                              │   Shows PIN modal       │
                              │                         │
                              └────────────┬────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
        ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
        │  User           │    │  API Error      │    │  Success        │
        │  Cancelled      │    │                 │    │                 │
        │                 │    │  showError      │    │  Update local   │
        │  (no change)    │    │  Dialog         │    │  watchlist      │
        │                 │    │  (no change)    │    │  state          │
        └─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Watchlist State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `watchlist` | `string[]` | Array of market pairs (e.g., `["DIST/NXS", "PEPE/NXS"]`) |
| `watchlistExists` | `boolean` | Whether the on-chain asset has been created |
| `watchlistLoading` | `boolean` | True during initial load |
| `watchlistUpdating` | `boolean` | True during create/update operations |

---

## Chart Features State Machine

The chart component provides multiple interactive features including time ranges, intervals, chart types, indicators, and drawing tools.

### Time Range Selection

```
                    ┌──────────────────────────────────────────────────────────┐
                    │                     setTimeRange(range)                  │
                    ▼                                                          │
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┴───┐
│  1 Week     │  │  1 Month    │  │  1 Year     │  │  5 Years    │  │   All Time  │
│  (1W)       │◄►│  (1M)       │◄►│  (1Y)       │◄►│  (5Y)       │◄►│   (All)     │
│  default    │  │             │  │             │  │             │  │             │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
        │                │                │                │                │
        ▼                ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Update Available Intervals                                  │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  1W  → 15min, 30min, 1hr, 4hr                                                   │
│  1M  → 1hr, 4hr, 12hr, 1D                                                       │
│  1Y  → 4hr, 12hr, 1D, 1W                                                        │
│  5Y  → 1D, 1W, 1M, 3M                                                           │
│  All → 1W, 1M, 3M, 1Y                                                           │
└─────────────────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Recalculate Candlesticks                                    │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  1. Filter data to time range                                                   │
│  2. Align to clock intervals (getAlignedIntervalStart)                          │
│  3. Aggregate trades into OHLC candles                                          │
│  4. Update main series and indicator series                                     │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Chart Type Selection

```
                    ┌─────────────────────────────────────────────┐
                    │              setChartType(type)             │
                    ▼                                             │
          ┌─────────────────┐                                     │
          │                 │                                     │
     ┌────┤  Candlestick    │◄────────────────────────────────────┤
     │    │  (default)      │                                     │
     │    │                 │                                     │
     │    └─────────────────┘                                     │
     │            ▲                                               │
     │            │                                               │
     ▼            ▼                                               │
┌─────────────────┐  ┌─────────────────┐                          │
│                 │  │                 │                          │
│  Line           │◄►│  Area           │◄─────────────────────────┘
│                 │  │                 │
└─────────────────┘  └─────────────────┘

On Type Change:
  1. Remove previous series from chart
  2. Create new series of selected type
  3. Set series data
  4. Recalculate and apply indicators
```

### Indicator Toggle

```
                    ┌─────────────────────────────────────────────┐
                    │            toggleIndicator(name)            │
                    │                                             │
                    │  Indicators: sma20, sma50, ema20, bb        │
                    └────────────────────┬────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────────┐
                    │                    │                        │
                    ▼                    ▼                        ▼
          ┌─────────────────┐  ┌─────────────────┐      ┌─────────────────┐
          │  Indicator      │  │  Indicator      │      │  Bollinger      │
          │  OFF            │  │  ON             │      │  Bands (BB)     │
          │                 │  │                 │      │                 │
          │  Not in         │  │  In indicators  │      │  Creates 3      │
          │  indicators     │  │  set            │      │  series:        │
          │  set            │  │                 │      │  upper, middle, │
          └────────┬────────┘  └────────┬────────┘      │  lower          │
                   │                    │               └────────┬────────┘
                   │ Toggle             │ Toggle                 │
                   ▼                    ▼                        │
          ┌─────────────────┐  ┌─────────────────┐               │
          │  Add to         │  │  Remove from    │               │
          │  indicators     │  │  indicators     │◄──────────────┘
          │  set            │  │  set            │
          │                 │  │                 │
          │  Create series  │  │  Remove series  │
          │  Calculate      │  │  from chart     │
          │  values         │  │                 │
          └─────────────────┘  └─────────────────┘

Calculation Functions:
  - SMA: Simple Moving Average (n-period average)
  - EMA: Exponential Moving Average (weighted recent prices)
  - BB:  Bollinger Bands (SMA ± 2 standard deviations)
```

### Drawing Tools State Machine

```
                              ┌─────────────────────────┐
                              │                         │
                              │   No Drawing Tool       │
                              │   Selected              │
                              │   (drawingTool = null)  │
                              │                         │
                              └────────────┬────────────┘
                                           │
                                           │ User selects tool
                                           ▼
        ┌──────────────────────────────────┼──────────────────────────────────┐
        │                 │                │                │                 │
        ▼                 ▼                ▼                ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌───────────┐
│  H-Line     │   │  Trend Line │   │  Ray        │   │  Fibonacci  │   │  None     │
│             │   │             │   │             │   │             │   │  (clear)  │
│  1 click    │   │  2 clicks   │   │  2 clicks   │   │  2 clicks   │   │           │
│  horizontal │   │  start/end  │   │  start →    │   │  high/low   │   │           │
└──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘   └───────────┘
       │                 │                 │                 │
       │                 │                 │                 │
       ▼                 ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Click Handler                                          │
│  ──────────────────────────────────────────────────────────────────────────────────  │
│                                                                                     │
│  if (drawingTool === 'hline'):                                                      │
│      Create horizontal line at click price                                          │
│      Add to drawings array                                                          │
│                                                                                     │
│  if (drawingTool === 'trendline' | 'ray' | 'fib'):                                  │
│      if (no drawingStart):                                                          │
│          Set drawingStart = { time, value }                                         │
│      else:                                                                          │
│          Create line/ray/fib from start to click point                              │
│          Add to drawings array                                                      │
│          Clear drawingStart                                                         │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              Render Drawings                                        │
│  ──────────────────────────────────────────────────────────────────────────────────  │
│                                                                                     │
│  drawings.forEach(drawing => {                                                      │
│      switch (drawing.type):                                                         │
│          'hline':     Create PriceLine at drawing.price                             │
│          'trendline': Create LineSeries from start to end                           │
│          'ray':       Create LineSeries extending to chart edge                     │
│          'fib':       Create 5 PriceLines at 0%, 23.6%, 38.2%, 50%, 61.8%, 100%     │
│  })                                                                                 │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Chart State Variables

| Variable | Type | Description |
|----------|------|-------------|
| `timeRange` | `string` | Selected time range: '1W', '1M', '1Y', '5Y', 'All' |
| `interval` | `number` | Candlestick interval in ms (e.g., 3600000 = 1 hour) |
| `chartType` | `string` | Chart type: 'candle', 'line', 'area' |
| `indicators` | `Set<string>` | Active indicators: 'sma20', 'sma50', 'ema20', 'bb' |
| `drawingTool` | `string\|null` | Active tool: 'hline', 'trendline', 'ray', 'fib', or null |
| `drawings` | `array` | Saved drawings with type and coordinates |
| `drawingStart` | `object\|null` | First point for 2-point drawings |

---

## Redux State Structure

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                     REDUX STORE                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                                    ui                                           │    │
│  ├─────────────────────────────────────────────────────────────────────────────────┤    │
│  │                                                                                 │    │
│  │  ┌─────────────────┐                                                            │    │
│  │  │ activeTab       │  "Overview" | "Trade" | "Chart" | "MarketDepth" |          │    │
│  │  │ (string)        │  "Markets" | "Portfolio" | "StablecoinSwap"                │    │
│  │  └─────────────────┘                                                            │    │
│  │                                                                                 │    │
│  │  ┌─────────────────────────────────────────────────────────────────────────┐    │    │
│  │  │                              market                                     │    │    │
│  │  ├─────────────────────────────────────────────────────────────────────────┤    │    │
│  │  │                                                                         │    │    │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐    │    │    │
│  │  │  │ marketPairs                                                     │    │    │    │
│  │  │  │ ├─ marketPair: "DIST/NXS"                                       │    │    │    │
│  │  │  │ ├─ baseToken: "DIST"                                            │    │    │    │
│  │  │  │ ├─ quoteToken: "NXS"                                            │    │    │    │
│  │  │  │ ├─ baseTokenMaxsupply, quoteTokenMaxsupply                      │    │    │    │
│  │  │  │ ├─ baseTokenCirculatingSupply, quoteTokenCirculatingSupply      │    │    │    │
│  │  │  │ ├─ baseTokenDecimals, quoteTokenDecimals                        │    │    │    │
│  │  │  │ └─ baseTokenAddress, quoteTokenAddress                          │    │    │    │
│  │  │  └─────────────────────────────────────────────────────────────────┘    │    │    │
│  │  │                                                                         │    │    │
│  │  │  ┌───────────────────────┐    ┌───────────────────────┐                 │    │    │
│  │  │  │ orderBook             │    │ executedOrders        │                 │    │    │
│  │  │  │ ├─ asks: []           │    │ ├─ bids: []           │                 │    │    │
│  │  │  │ └─ bids: []           │    │ └─ asks: []           │                 │    │    │
│  │  │  └───────────────────────┘    └───────────────────────┘                 │    │    │
│  │  │                                                                         │    │    │
│  │  │  ┌───────────────────────┐    ┌───────────────────────┐                 │    │    │
│  │  │  │ myOrders              │    │ myTrades              │                 │    │    │
│  │  │  │ └─ orders: []         │    │ └─ executed: []       │                 │    │    │
│  │  │  └───────────────────────┘    └───────────────────────┘                 │    │    │
│  │  │                                                                         │    │    │
│  │  │  ┌───────────────────────┐    ┌───────────────────────┐                 │    │    │
│  │  │  │ myUnconfirmedOrders   │    │ myUnconfirmedTrades   │                 │    │    │
│  │  │  │ └─ unconfirmedOrders  │    │ └─ unconfirmedTrades  │                 │    │    │
│  │  │  │     : []              │    │     : []              │                 │    │    │
│  │  │  └───────────────────────┘    └───────────────────────┘                 │    │    │
│  │  │                                                                         │    │    │
│  │  │  ┌───────────────────────┐    ┌───────────────────────────────────┐     │    │    │
│  │  │  │ myCancellingOrders    │    │ orderInQuestion                   │     │    │    │
│  │  │  │ └─ cancellingOrders   │    │ ├─ txid, price, amount, type      │     │    │    │
│  │  │  │     : []              │    │ ├─ marketPair, orderMethod        │     │    │    │
│  │  │  └───────────────────────┘    │ └─ availableOrders: []            │     │    │    │
│  │  │                               └───────────────────────────────────┘     │    │    │
│  │  └─────────────────────────────────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                                  settings                                       │    │
│  ├─────────────────────────────────────────────────────────────────────────────────┤    │
│  │  ┌─────────────────┐                                                            │    │
│  │  │ timeSpan        │  "1y" | "6m" | "3m" | "1m" | "1w" | ...                     │    │
│  │  │ (string)        │                                                            │    │
│  │  └─────────────────┘                                                            │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐    │
│  │                                   nexus                                         │    │
│  ├─────────────────────────────────────────────────────────────────────────────────┤    │
│  │  (Managed by nexus-module walletDataReducer)                                    │    │
│  │  ├─ initialized: boolean                                                        │    │
│  │  ├─ theme: object                                                               │    │
│  │  └─ ... (wallet data)                                                           │    │
│  └─────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Action Types Summary

| Action Type | Description | State Affected |
|-------------|-------------|----------------|
| `SWITCH_TAB` | Changes active navigation tab | `ui.activeTab` |
| `SET_MARKET_PAIR` | Sets current trading pair with all token attributes | `ui.market.marketPairs` |
| `SET_ORDER_BOOK` | Updates order book with asks/bids | `ui.market.orderBook` |
| `SET_EXECUTED_ORDERS` | Updates trade history | `ui.market.executedOrders` |
| `SET_MY_ORDERS` | Updates user's active orders | `ui.market.myOrders` |
| `SET_MY_TRADES` | Updates user's trade history | `ui.market.myTrades` |
| `SET_TIMESPAN` | Changes chart timespan | `settings.timeSpan` |
| `ADD_UNCONFIRMED_ORDER` | Adds pending order | `ui.market.myUnconfirmedOrders` |
| `REMOVE_UNCONFIRMED_ORDER` | Removes confirmed order from pending | `ui.market.myUnconfirmedOrders` |
| `ADD_CANCELLING_ORDER` | Marks order as being cancelled | `ui.market.myCancellingOrders` |
| `REMOVE_CANCELLING_ORDER` | Removes from cancelling list | `ui.market.myCancellingOrders` |
| `ADD_UNCONFIRMED_TRADE` | Adds pending trade | `ui.market.myUnconfirmedTrades` |
| `REMOVE_UNCONFIRMED_TRADE` | Removes confirmed trade from pending | `ui.market.myUnconfirmedTrades` |
| `SET_ORDER` | Sets currently selected order for execution | `ui.market.orderInQuestion` |
| `SET_AVAILABLE_ORDERS_AT_PRICE` | Sets available orders at a price point | `ui.market.orderInQuestion` |
| `INITIALIZE` | Nexus module initialization | Merges stored data |

---

## State Transitions Quick Reference

### Order States
```
(none) → Unconfirmed → Confirmed → [Executed | Cancelled | Partially Filled]
```

### Trade States
```
(none) → Unconfirmed Trade → Confirmed Trade
```

### Cancellation States
```
Active Order → Cancelling → Cancelled (removed)
```
