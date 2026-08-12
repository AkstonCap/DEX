//import { listMarket } from 'actions/listMarket';
import { setOrderBook, setMyOrders, removeUnconfirmedOrder, removeCancellingOrder, removeUnconfirmedTrade } from './actionCreators';
import {
    showErrorDialog,
    apiCall
} from 'nexus-module';
import { normalizeMarketEntries } from '../utils/marketData';

export const fetchOrderBook = (
) => async (
    dispatch,
    getState
) => {
    try {
        const state = getState();
        const marketPair = state.ui.market.marketPairs.marketPair;
        const baseToken = state.ui.market.marketPairs.baseToken;
        const quoteToken = state.ui.market.marketPairs.quoteToken;

        const data1 = await apiCall(
            'market/list/order/txid,owner,price,type,timestamp,contract.amount,contract.ticker,order.amount,order.ticker',
            {
                market: marketPair,
                sort: 'price',
                order: 'desc',
                limit: 100
            }
        );

        // The endpoint omits a side entirely when it is empty, so an
        // `?.length !== 0` check would fall straight through to forEach on
        // undefined. normalizeMarketEntries converts NXS divisible units and
        // recomputes price from the amounts (see utils/marketData.js).
        const bids = normalizeMarketEntries(data1?.bids).sort((a, b) => b.price - a.price);
        const asks = normalizeMarketEntries(data1?.asks).sort((a, b) => b.price - a.price);

        dispatch(setOrderBook({ bids, asks }));

        // Query by market param instead of token when dealing with NXS pairs
        // to avoid null/invalid token issues
        // Also use market param if baseToken is not set
        const myOrdersParams = (baseToken === 'NXS' || quoteToken === 'NXS' || !baseToken)
            ? { market: marketPair }
            : { token: baseToken };

        // Skip fetching user orders if parameters are invalid
        if (!myOrdersParams.market && !myOrdersParams.token) {
            console.warn('Skipping user orders fetch - missing valid token/market parameter');
            return;
        }
        if (myOrdersParams.market === '' || myOrdersParams.token === '') {
            console.warn('Skipping user orders fetch - empty token/market parameter');
            return;
        }

        let myOrdersError = null;
        const myOrdersResponse = await apiCall(
            'market/user/order',
            myOrdersParams
        ).catch(async (error1) => {
            // Silent error - just log, don't show popup
            console.warn('Cannot get my orders (market/user/order):', error1?.message || 'Unknown error');
            myOrdersError = error1?.message || 'Unable to load orders';
            
            // Fallback: Extract user orders from the order book by matching genesis
            try {
                // Get current user's genesis from session status
                const sessionStatus = await apiCall('sessions/status/local');
                const userGenesis = sessionStatus?.genesis;
                
                if (!userGenesis) {
                    console.warn('Could not get user genesis for order filtering');
                    return { orders: [], error: myOrdersError };
                }
                
                // Filter the already-normalized order book by owner
                const userBids = bids.filter(order => order.owner === userGenesis);
                const userAsks = asks.filter(order => order.owner === userGenesis);
                const userOrders = [...userBids, ...userAsks];

                // Mark that these orders are already normalized from the order book
                return { orders: userOrders, error: null, alreadyNormalized: true };
                
            } catch (fallbackError) {
                console.error('Fallback order extraction failed:', fallbackError);
                return { orders: [], error: myOrdersError };
            }
        });

        // The fallback deliberately reports `error: null` when it recovers the
        // orders from the order book, so an explicit field always wins.
        const hasExplicitError = myOrdersResponse && 'error' in myOrdersResponse;
        const myOrders = {
            ...(myOrdersResponse || {}),
            orders: Array.isArray(myOrdersResponse?.orders) ? myOrdersResponse.orders : [],
            error: hasExplicitError ? myOrdersResponse.error : (myOrdersError || null),
        };

        // Orders recovered from the order book by the fallback below are
        // already normalized; normalizing twice would divide NXS by 1e6 again.
        if (!myOrders.alreadyNormalized) {
            myOrders.orders = normalizeMarketEntries(myOrders.orders);
        }

        dispatch(setMyOrders(myOrders));
        
        // Remove any orders that are now confirmed from unconfirmed orders
        const currentState = getState();
        const unconfirmedOrders = currentState.ui.market.myUnconfirmedOrders?.unconfirmedOrders || [];
        const cancellingOrders = currentState.ui.market.myCancellingOrders?.cancellingOrders || [];
        const unconfirmedTrades = currentState.ui.market.myUnconfirmedTrades?.unconfirmedTrades || [];
        // The myTrades reducer stores the list under `executed`
        const myTrades = currentState.ui.market.myTrades?.executed || [];
        
        myOrders.orders.forEach(confirmedOrder => {
            const wasUnconfirmed = unconfirmedOrders.find(unconfirmed => unconfirmed.txid === confirmedOrder.txid);
            if (wasUnconfirmed) {
                dispatch(removeUnconfirmedOrder(confirmedOrder.txid));
            }
        });
        
        // Also check trade history - if an unconfirmed order appears in trades, it was executed
        unconfirmedOrders.forEach(unconfirmedOrder => {
            const wasExecuted = myTrades.find(trade => trade.txid === unconfirmedOrder.txid);
            if (wasExecuted) {
                dispatch(removeUnconfirmedOrder(unconfirmedOrder.txid));
            }
        });
        
        // Remove any orders that were being cancelled but are no longer in the order book
        cancellingOrders.forEach(cancellingOrder => {
            const stillExists = myOrders.orders.find(order => order.txid === cancellingOrder.txid);
            if (!stillExists) {
                // Order was successfully cancelled, remove from cancelling orders
                dispatch(removeCancellingOrder(cancellingOrder.txid));
            }
        });
        
        // Remove any unconfirmed trades that now appear in confirmed trade history
        unconfirmedTrades.forEach(unconfirmedTrade => {
            const isConfirmed = myTrades.find(trade => 
                trade.txid === unconfirmedTrade.txid ||
                (trade.timestamp === unconfirmedTrade.timestamp && 
                 trade.amount === unconfirmedTrade.amount &&
                 trade.total === unconfirmedTrade.total)
            );
            if (isConfirmed) {
                dispatch(removeUnconfirmedTrade(unconfirmedTrade.txid || `${unconfirmedTrade.timestamp}-${unconfirmedTrade.amount}`));
            }
        });
        
        return true; // Return success indicator
        
    } catch (error) {

        showErrorDialog({
            message: 'Cannot get order book (fetchOrderBook)',
            note: error?.message || 'Unknown error',
        });

        dispatch(setOrderBook({bids: [], asks: []}));
        dispatch(setMyOrders({orders: [], error: error?.message || 'Unable to load orders'}));
        return null; // Return null for error
    }
}