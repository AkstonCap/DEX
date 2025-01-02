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

        dispatch(setOrderBook(orders));

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