import { listMarket, DEFAULT_MARKET_PAIR } from './listMarket';

export const fetchExecuted = async (
  inputMarket = DEFAULT_MARKET_PAIR, 
  checkingMarket, 
  setCheckingMarket, 
  setExecutedOrders,
  setExecutedBids,
  setExecutedAsks, 
  showErrorDialog,
  timeFilter = '1d'
) => {
    if (checkingMarket) return;
    try {
      setCheckingMarket(true);
      const pair = inputMarket;
      const data = await listMarket(
        pair, 
        'executed',
        '', 
        'time', 
        'desc', 
        timeFilter, 
        0,
        null
      );

      //const data = [...dataInit.bids, ...dataInit.asks]; // Adjust this if data structure is different

      setExecutedOrders([...data.bids, ...data.asks]);
      setExecutedBids([...data.bids]);
      setExecutedAsks([...data.asks]);

    } catch (error) {
      showErrorDialog({
        message: 'Cannot get transactions',
        note: error?.message || 'Unknown error',
      });
    } finally {
      setCheckingMarket(false);
    }
};