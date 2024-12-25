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

export const setOrder = (address, price, amount) => ({
  type: TYPE.SET_ORDER,
  payload: {
    address,
    price,
    amount,
  },
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