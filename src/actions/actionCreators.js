import * as TYPE from './types';

export const setMarketPair = (orderToken, baseToken) => ({
  type: TYPE.SET_MARKET_PAIR,
  payload: {
    marketPair: `${orderToken}/${baseToken}`,
    orderToken,
    baseToken,
  },
});

export const setOrderBook = (orderBook) => ({
  type: TYPE.SET_ORDER_BOOK,
  payload: orderBook,
});

export const setOrderBookBids = (orderBookBids) => ({
  type: TYPE.SET_ORDER_BOOK_BIDS,
  payload: orderBookBids,
});

export const setOrderBookAsks = (orderBookAsks) => ({
  type: TYPE.SET_ORDER_BOOK_ASKS,
  payload: orderBookAsks,
});

export const switchTab = (tab) => ({
  type: TYPE.SWITCH_TAB,
  payload: tab,
});

export const setExecutedOrders = (executedOrders) => ({
  type: TYPE.SET_EXECUTED_ORDERS,
  payload: executedOrders,
});

export const setExecutedBids = (executedBids) => ({
  type: TYPE.SET_EXECUTED_BIDS,
  payload: executedBids,
});

export const setExecutedAsks = (executedAsks) => ({
  type: TYPE.SET_EXECUTED_ASKS,
  payload: executedAsks,
});