import { listMarket } from './listMarket';
import { 
  setExecutedOrders,
} from './actionCreators';
import { showErrorDialog } from 'nexus-module';
import { DEFAULT_MARKET_PAIR } from 'App/Main';

export const fetchExecuted = (
  inputMarket = DEFAULT_MARKET_PAIR, 
  timeFilter = '1d'
) => async (
  dispatch
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
      dispatch(setExecutedOrders(data));

    } catch (error) {
      dispatch(showErrorDialog({
        message: 'Cannot get transactions',
        note: error?.message || 'Unknown error',
      }));
      dispatch(setExecutedOrders([]));
    }
};