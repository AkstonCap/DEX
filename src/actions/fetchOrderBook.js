import { listMarket, DEFAULT_MARKET_PAIR } from 'actions/listMarket';

export const fetchOrderBook = async (
    inputMarket = DEFAULT_MARKET_PAIR, 
    checkingMarket, 
    setCheckingMarket, 
    setOrderBook,
    setOrderBookBids,
    setOrderBookAsks, 
    showErrorDialog
    ) => {
        if (checkingMarket) return;
        try {
        setCheckingMarket(true);
        const pair = inputMarket;
        const orders = await listMarket(pair, 'order', 'time', 'desc', 'all', 0);
        setOrderBook(orders);
        const bids = await listMarket(pair, 'bids', 'price', 'desc', 'all', 0);
        setOrderBookBids(bids);
        const asks = await listMarket(pair, 'asks', 'price', 'asc', 'all', 0);
        setOrderBookAsks(asks);
        } catch (error) {
        showErrorDialog({
            message: 'Cannot get order book',
            note: error?.message || 'Unknown error',
        });
        } finally {
        setCheckingMarket(false);
        }
    }