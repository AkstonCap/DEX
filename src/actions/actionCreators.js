import * as TYPE from './types';

export const setMarketPair = (
  marketPair,
  baseToken, 
  quoteToken, 
  baseTokenMaxsupply, 
  quoteTokenMaxsupply, 
  baseTokenCirculatingSupply, 
  quoteTokenCirculatingSupply,
  baseTokenDecimals,
  quoteTokenDecimals,
  baseTokenAddress,
  quoteTokenAddress
) => ({
  type: TYPE.SET_MARKET_PAIR,
  payload: {
    marketPair,
    baseToken,
    quoteToken,
    baseTokenMaxsupply,
    quoteTokenMaxsupply,
    baseTokenCirculatingSupply,
    quoteTokenCirculatingSupply,
    baseTokenDecimals,
    quoteTokenDecimals,
    baseTokenAddress,
    quoteTokenAddress
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

export const setOrder = (txid, price, amount, type, marketPair, orderMethod) => ({
  type: TYPE.SET_ORDER,
  payload: {
    txid,
    price,
    amount,
    type,
    marketPair,
    orderMethod,
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

export const setTimeSpan = (timeSpan) => ({
  type: TYPE.SET_TIMESPAN,
  payload: timeSpan,
});

export const setUnconfirmedOrders = (txid, price, amount, type, marketPair) => ({
  type: TYPE.SET_MY_UNCONFIRMEDORDERS,
  payload: {
    txid,
    price,
    amount,
    type,
    marketPair,
  },
});

/*export const removeUnconfirmedOrder = (txid) => ({
  type: TYPE.REMOVE_UNCONFIRMED_ORDER,
  payload: txid,
});
*/
/*
export const updateInput = (orderToken, baseToken) => ({
  type: TYPE.UPDATE_INPUT,
  payload: {
    orderToken,
    baseToken
  },
});
*/