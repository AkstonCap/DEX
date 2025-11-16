//import { listMarket } from 'actions/listMarket';
import { setOrderBook, setMyOrders, removeUnconfirmedOrder, removeCancellingOrder, removeUnconfirmedTrade } from './actionCreators';
import { 
    showErrorDialog, 
    apiCall 
} from 'nexus-module';

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

        if ( data1.bids?.length !== 0 ) {
            data1.bids.forEach((element) => {
              if (element.contract.ticker === 'NXS') {
                element.contract.amount = element.contract.amount / 1e6;
              }
              if (element.order.ticker === 'NXS') {
                element.order.amount = element.order.amount / 1e6;
              }
              // Recalculate price after normalization for bids: price = contract/order
              element.price = element.contract.amount / element.order.amount;
            });
            data1.bids.sort((a, b) => b.price - a.price);
        }
      
        if ( data1.asks?.length !== 0 ) {
            data1.asks.forEach((element) => {
              if (element.contract.ticker === 'NXS') {
                element.contract.amount = element.contract.amount / 1e6;
              }
              if (element.order.ticker === 'NXS') {
                element.order.amount = element.order.amount / 1e6;
              }
              // Recalculate price after normalization for asks: price = order/contract
              element.price = element.order.amount / element.contract.amount;
            });
            data1.asks.sort((a, b) => b.price - a.price);
        }

        dispatch(setOrderBook(data1));

        // Query by market param instead of token when dealing with NXS pairs
        // to avoid null/invalid token issues
        // Also use market param if baseToken is not set
        const myOrdersParams = (baseToken === 'NXS' || quoteToken === 'NXS' || !baseToken)
            ? { market: marketPair }
            : { token: baseToken };

        let myOrdersError = null;
        let myOrders = await apiCall(
            'market/user/order',
            myOrdersParams
        ).catch(async (error1) => {
            // Silent error - just log, don't show popup
            console.warn('Cannot get my orders (market/user/order):', error1?.message || 'Unknown error');
            myOrdersError = error1?.message || 'Unable to load orders';
            
            // Fallback: Extract user orders from the order book by matching genesis
            try {
                console.log('Attempting to extract user orders from order book...');
                
                // Get current user's genesis from session status
                const sessionStatus = await apiCall('sessions/status/local');
                const userGenesis = sessionStatus?.genesis;
                
                if (!userGenesis) {
                    console.warn('Could not get user genesis for order filtering');
                    return { orders: [], error: myOrdersError };
                }
                
                // Filter orders from data1 by owner matching user genesis
                const userBids = (data1.bids || []).filter(order => order.owner === userGenesis);
                const userAsks = (data1.asks || []).filter(order => order.owner === userGenesis);
                const userOrders = [...userBids, ...userAsks];
                
                console.log(`Found ${userOrders.length} user orders in order book`);
                // Mark that these orders are already normalized from the order book
                return { orders: userOrders, error: null, alreadyNormalized: true };
                
            } catch (fallbackError) {
                console.error('Fallback order extraction failed:', fallbackError);
                return { orders: [], error: myOrdersError };
            }
        });

        // Only normalize if not already normalized (i.e., came directly from API, not from order book)
        if (!myOrders.alreadyNormalized) {
            myOrders.orders.forEach((element) => {
                if (element.contract.ticker === 'NXS') {
                    element.contract.amount = element.contract.amount / 1e6;
                }
                if (element.order.ticker === 'NXS') {
                    element.order.amount = element.order.amount / 1e6;
                }
                // Recalculate price after normalization
                if (element.type === 'bid') {
                    // Bid: price = contract/order (quote per base)
                    element.price = element.contract.amount / element.order.amount;
                } else if (element.type === 'ask') {
                    // Ask: price = order/contract (quote per base)
                    element.price = element.order.amount / element.contract.amount;
                }
            });
        }

        dispatch(setMyOrders(myOrders));
        
        // Remove any orders that are now confirmed from unconfirmed orders
        const currentState = getState();
        const unconfirmedOrders = currentState.ui.market.myUnconfirmedOrders?.unconfirmedOrders || [];
        const cancellingOrders = currentState.ui.market.myCancellingOrders?.cancellingOrders || [];
        const unconfirmedTrades = currentState.ui.market.myUnconfirmedTrades?.unconfirmedTrades || [];
        const myTrades = currentState.ui.market.myTrades?.trades || [];
        
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

        dispatch(showErrorDialog({
            message: 'Cannot get order book (fetchOrderBook)',
            note: error?.message || 'Unknown error',
        }));

        dispatch(setOrderBook({bids: [], asks: []}));
        dispatch(setMyOrders({bids: [], asks: []}));
        return null; // Return null for error
    }
}