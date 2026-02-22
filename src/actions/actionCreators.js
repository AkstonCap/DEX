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

export const setAvailableOrdersAtPrice = (orders, price, type) => ({
  type: TYPE.SET_AVAILABLE_ORDERS_AT_PRICE,
  payload: {
    orders,
    price,
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

export const setTimeSpan = (timeSpan) => ({
  type: TYPE.SET_TIMESPAN,
  payload: timeSpan,
});

export const setUnconfirmedOrders = (unconfirmedOrders) => ({
  type: TYPE.SET_MY_UNCONFIRMEDORDERS,
  payload: {
    unconfirmedOrders,
  },
});

export const addUnconfirmedOrder = (order) => ({
  type: TYPE.ADD_UNCONFIRMED_ORDER,
  payload: order,
});

export const removeUnconfirmedOrder = (txid) => ({
  type: TYPE.REMOVE_UNCONFIRMED_ORDER,
  payload: { txid },
});

export const addCancellingOrder = (txid, cancellationTxid) => ({
  type: TYPE.ADD_CANCELLING_ORDER,
  payload: { txid, cancellationTxid },
});

export const removeCancellingOrder = (txid) => ({
  type: TYPE.REMOVE_CANCELLING_ORDER,
  payload: { txid },
});

export const setUnconfirmedTrades = (unconfirmedTrades) => ({
  type: TYPE.SET_MY_UNCONFIRMEDTRADES,
  payload: {
    unconfirmedTrades,
  },
});

export const addUnconfirmedTrade = (trade) => ({
  type: TYPE.ADD_UNCONFIRMED_TRADE,
  payload: trade,
});

export const removeUnconfirmedTrade = (txid) => ({
  type: TYPE.REMOVE_UNCONFIRMED_TRADE,
  payload: { txid },
});

// NFT Art Marketplace
export const setNftListings = (listings) => ({
  type: TYPE.SET_NFT_LISTINGS,
  payload: listings,
});

export const setNftSelected = (nft) => ({
  type: TYPE.SET_NFT_SELECTED,
  payload: nft,
});

export const setNftMyAssets = (assets) => ({
  type: TYPE.SET_NFT_MY_ASSETS,
  payload: assets,
});

export const setNftLoading = (loading) => ({
  type: TYPE.SET_NFT_LOADING,
  payload: loading,
});

export const setNftFilter = (filter) => ({
  type: TYPE.SET_NFT_FILTER,
  payload: filter,
});