//import { listMarket } from 'actions/listMarket';
import { setOrderBook, setMyOrders } from './actionCreators';
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
        //const pair = inputMarket;
        const state = getState();
        const marketPair = state.ui.market.marketPairs.marketPair;
        const baseToken = state.ui.market.marketPairs.baseToken;

        const data1 = await apiCall(
            'market/list/order/txid,owner,price,type,contract.amount,contract.ticker,order.amount,order.ticker',
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
              } else if (element.order.ticker === 'NXS') {
                element.order.amount = element.order.amount / 1e6;
              }
            });
            data1.bids.forEach((element) => {
                if (element.price !== (element.contract.amount / element.order.amount)) {
                    element.price = (element.contract.amount / element.order.amount);
                }
            });
            data1.bids.sort((a, b) => b.price - a.price);
        }
      
        if ( data1.asks?.length !== 0 ) {
            data1.asks.forEach((element) => {
              if (element.contract.ticker === 'NXS') {
                element.contract.amount = element.contract.amount / 1e6;
              } else if (element.order.ticker === 'NXS') {
                element.order.amount = element.order.amount / 1e6;
              }
            });      
            data1.asks.forEach((element) => {
              if (element.price !== (element.order.amount / element.contract.amount)) {
                element.price = (element.order.amount / element.contract.amount);
              }
            });
            data1.asks.sort((a, b) => b.price - a.price);
        }

        dispatch(setOrderBook(data1));

        const myOrders = await apiCall(
            'market/user/order',
            {
                //market: pair,
                token: baseToken,
            }
        ).catch((error1) => {
            dispatch(showErrorDialog({
                message: 'Cannot get my orders (market/user/order)',
                note: error1?.message || 'Unknown error',
            }));
            return myOrders = {orders: []};
        });

        myOrders.orders.forEach((element) => {
            if (element.contract.ticker === 'NXS') {
                element.contract.amount = element.contract.amount / 1e6;
            } else if (element.order.ticker === 'NXS') {
                element.order.amount = element.order.amount / 1e6;
            }
        });

        myOrders.orders.forEach((element) => {
            if (element.type === 'bid' && element.price !== (element.order.amount / element.contract.amount)) {
                element.price = (element.order.amount / element.contract.amount);
            } else if (element.type === 'ask' && element.price !== (element.contract.amount / element.order.amount)) {
                element.price = (element.contract.amount / element.order.amount);
            }
        });

        dispatch(setMyOrders(myOrders));
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