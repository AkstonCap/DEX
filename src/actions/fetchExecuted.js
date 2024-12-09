import { listMarket } from './listMarket';
import { 
  setExecutedOrders,
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
      if (!data.bids) {
        data.bids = [];
      }
      if (!data.asks) {
        data.asks = [];
      }
      setExecutedOrders(data);

    } catch (error) {
      showErrorDialog({
        message: 'Cannot get transactions',
        note: error?.message || 'Unknown error',
      });
      setExecutedOrders([]);
    }
};