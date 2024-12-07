import * as TYPE from './types';
/*
export const setBaseTokenField = (baseTokenField) => ({
  type: TYPE.SET_BASE_TOKEN_FIELD,
  payload: baseTokenField,
});

export const setOrderTokenField = (orderTokenField) => ({
  type: TYPE.SET_ORDER_TOKEN_FIELD,
  payload: orderTokenField,
});
*/
export const setMarketPair = (marketPair) => ({
  type: TYPE.SET_MARKET_PAIR,
  payload: marketPair,
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

export const setOrderToken = (orderToken) => ({
  type: TYPE.SET_ORDER_TOKEN,
  payload: orderToken,
});

export const setBaseToken = (baseToken) => ({
  type: TYPE.SET_BASE_TOKEN,
  payload: baseToken,
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