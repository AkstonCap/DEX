import { listMarket } from 'actions/listMarket';
import { 
    setOrderBook
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
            '', 
            'price', 
            'desc', 
            'all', 
            0,
            null
            );
        setOrderBook(orders);
        
        } catch (error) {
        showErrorDialog({
            message: 'Cannot get order book',
            note: error?.message || 'Unknown error',
        });
        setOrderBook([]);
    }
}