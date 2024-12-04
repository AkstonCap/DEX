import { listMarket, DEFAULT_MARKET_PAIR } from 'actions/listMarket';
import { 
    setOrderBook,
    setOrderBookAsks,
    setOrderBookBids,
} from './actionCreators';
import { showErrorDialog } from 'nexus-module';

export const fetchOrderBook = async (
    inputMarket = DEFAULT_MARKET_PAIR
    ) => {
    try {
        const pair = inputMarket;

        const orders = await listMarket(
            pair, 
            'order', 
            '', 
            'time', 
            'desc', 
            'all', 
            0,
            null
            );
        setOrderBook(orders);

        const bids = await listMarket(
            pair, 
            'bids', 
            '', 
            'price', 
            'desc', 
            'all', 
            0,
            null
            );
        setOrderBookBids(bids);

        const asks = await listMarket(
            pair, 
            'asks', 
            '', 
            'price', 
            'asc', 
            'all', 
            0,
            null
            );
        setOrderBookAsks(asks);
        
        } catch (error) {
        showErrorDialog({
            message: 'Cannot get order book',
            note: error?.message || 'Unknown error',
        });
    }
}