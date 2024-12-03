import * as TYPE from './types';

export const updateInput = (inputValue) => ({
  type: TYPE.UPDATE_INPUT,
  payload: inputValue,
});

export const setLastPrice = (lastPrice) => ({
  type: TYPE.SET_LAST_PRICE,
  payload: lastPrice,
});

export const setHighestBid = (highestBid) => ({
  type: TYPE.SET_HIGHEST_BID,
  payload: highestBid,
});

export const setLowestAsk = (lowestAsk) => ({
  type: TYPE.SET_LOWEST_ASK,
  payload: lowestAsk,
});

export const setBaseTokenVolume = (baseTokenVolume) => ({
  type: TYPE.SET_BASE_TOKEN_VOLUME,
  payload: baseTokenVolume,
});

export const setOrderTokenVolume = (orderTokenVolume) => ({
  type: TYPE.SET_ORDER_TOKEN_VOLUME,
  payload: orderTokenVolume,
});

export const setBaseTokenField = (baseTokenField) => ({
  type: TYPE.SET_BASE_TOKEN_FIELD,
  payload: baseTokenField,
});

export const setOrderTokenField = (orderTokenField) => ({
  type: TYPE.SET_ORDER_TOKEN_FIELD,
  payload: orderTokenField,
});

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