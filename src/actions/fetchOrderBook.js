import { listMarket } from 'actions/listMarket';
import { setOrderBook } from './actionCreators';
import { showErrorDialog } from 'nexus-module';
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
        
        } catch (error) {
        dispatch(showErrorDialog({
            message: 'Cannot get order book',
            note: error?.message || 'Unknown error',
        }));
        dispatch(setOrderBook([]));
    }
}