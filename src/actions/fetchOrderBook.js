import { listMarket } from 'actions/listMarket';
import { setOrderBook, setMyOrders } from './actionCreators';
import { 
    showErrorDialog, 
    apiCall 
} from 'nexus-module';
import { DEFAULT_MARKET_PAIR } from 'App/Main';

export const fetchOrderBook = (
    inputMarket = DEFAULT_MARKET_PAIR
) => async (
    dispatch
) => {
    try {
        const pair = inputMarket;
/*
        const orders = await listMarket(
            pair, 
            'order', 
            '',
            '', 
            'price', 
            'desc', 
            'all', 
            0,
            null
        );
*/
        const data1 = await apiCall(
            'market/list/order/txid,owner,price,type,contract.amount,contract.ticker,order.amount,order.ticker',
            {
                market: pair,
                sort: 'price',
                order: 'desc',
                limit: 100
            }
        );

        if (!data1.bids || data1.bids?.length === 0) {
            data1.bids = [];
            dispatch(showErrorDialog('No bids found in executed orders'));
        } else {
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
      
        if (!data1.asks || data1.asks?.length === 0) {
            data1.asks = [];
            dispatch(showErrorDialog('No asks found in executed orders'));
        } else {
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
                token: pair.split('/')[0]
            }
        ).catch((error1) => {
            dispatch(showErrorDialog({
                message: 'Cannot get my orders (market/user/order)',
                note: error1?.message || 'Unknown error',
            }));
            return myOrders = {bids: [], asks: []};
        });

        dispatch(setMyOrders(myOrders));
        
    } catch (error) {

        dispatch(showErrorDialog({
            message: 'Cannot get order book (fetchOrderBook)',
            note: error?.message || 'Unknown error',
        }));

        dispatch(setOrderBook({bids: [], asks: []}));
        dispatch(setMyOrders({bids: [], asks: []}));
    }
}