import * as TYPE from './types';

export const updateInput = (inputValue) => ({
  type: TYPE.UPDATE_INPUT,
  payload: inputValue,
});

export const setLastPrice = (price) => ({
  type: TYPE.SET_LAST_PRICE,
  payload: price,
});

export const setHighestBid = (bid) => ({
  type: TYPE.SET_HIGHEST_BID,
  payload: bid,
});

export const setLowestAsk = (ask) => ({
  type: TYPE.SET_LOWEST_ASK,
  payload: ask,
});

export const setBaseTokenVolume = (volume) => ({
  type: TYPE.SET_BASE_TOKEN_VOLUME,
  payload: volume,
});

export const setOrderTokenVolume = (volume) => ({
  type: TYPE.SET_ORDER_TOKEN_VOLUME,
  payload: volume,
});

export const setInputBaseToken = (token) => ({
  type: TYPE.SET_INPUT_BASE_TOKEN,
  payload: token,
});

export const setInputOrderToken = (token) => ({
  type: TYPE.SET_INPUT_ORDER_TOKEN,
  payload: token,
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

export const setOrderToken = (token) => ({
  type: TYPE.SET_ORDER_TOKEN,
  payload: token,
});

export const setBaseToken = (token) => ({
  type: TYPE.SET_BASE_TOKEN,
  payload: token,
});

export const switchTab = (tab) => ({
  type: TYPE.SWITCH_TAB,
  payload: tab,
});