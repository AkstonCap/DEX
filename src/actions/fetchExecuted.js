import { listMarket } from './listMarket';
import { 
  setExecutedOrders,
  setExecutedBids,
  setExecutedAsks,
} from './actionCreators';
import { showErrorDialog } from 'nexus-module';

export const fetchExecuted = async (
  inputMarket = DEFAULT_MARKET_PAIR, 
  timeFilter = '1d'
) => {
    try {
      const pair = inputMarket;
      const data = await listMarket(
        pair, 
        'executed',
        '',
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
    }
};