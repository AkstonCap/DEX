import * as TYPE from './types';

export const setMarketPair = (baseToken, quoteToken) => ({
  type: TYPE.SET_MARKET_PAIR,
  payload: {
    marketPair: `${baseToken}/${quoteToken}`,
    baseToken,
    quoteToken,
  },
});

export const setOrderBook = (orderBook) => ({
  type: TYPE.SET_ORDER_BOOK,
  payload: orderBook,
});

export const switchTab = (tab) => ({
  type: TYPE.SWITCH_TAB,
  payload: tab,
});

export const setExecutedOrders = (executedOrders) => ({
  type: TYPE.SET_EXECUTED_ORDERS,
  payload: executedOrders,
});

export const setOrder = (address, price, amount, type) => ({
  type: TYPE.SET_ORDER,
  payload: {
    address,
    price,
    amount,
    type,
  },
});

export const setMyOrders = (myOrders) => ({
  type: TYPE.SET_MY_ORDERS,
  payload: myOrders,
});

export const setMyTrades = (myTrades) => ({
  type: TYPE.SET_MY_TRADES,
  payload: myTrades,
});

/*
export const updateInput = (orderToken, baseToken) => ({
  type: TYPE.UPDATE_INPUT,
  payload: {
    orderToken,
    baseToken
  },
});
*/