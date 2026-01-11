# DEX Application State Machine Diagrams

This document contains state machine diagrams for the Distordia DEX Module, illustrating the various state transitions and flows within the application.

## Table of Contents
1. [Application Overview](#application-overview)
2. [Tab Navigation State Machine](#tab-navigation-state-machine)
3. [Order Lifecycle State Machine](#order-lifecycle-state-machine)
4. [Trade Execution State Machine](#trade-execution-state-machine)
5. [Order Cancellation State Machine](#order-cancellation-state-machine)
6. [Market Data State Machine](#market-data-state-machine)
7. [Redux State Structure](#redux-state-structure)

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
