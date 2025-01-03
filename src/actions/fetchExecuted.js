import { listMarket } from './listMarket';
import { 
  setExecutedOrders,
  setMyTrades,
} from './actionCreators';
import { 
  showErrorDialog, 
  apiCall 
} from 'nexus-module';
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

      if (!data.bids) {
        data.bids = [];
      }
      if (!data.asks) {
        data.asks = [];
      }

      dispatch(setExecutedOrders(data));
      const baseToken = pair.split('/')[0];
      const myTrades = await apiCall(
        'market/user/executed', 
        {
          //market: pair,
          token:  baseToken,
          sort: 'timestamp', 
          order: 'desc', 
          limit: 10
        }
      ).catch((error1) => {
        dispatch(showErrorDialog({
          message: 'Cannot get my trade history (market/user/executed)',
          note: error1?.message || 'Unknown error',
        }));
        return myTrades={bids: [], asks: []};
      });

      dispatch(setMyTrades(myTrades));

    } catch (error) {
      
      dispatch(showErrorDialog({
        message: 'Cannot get executed transactions (fetchExecuted)',
        note: error?.message || 'Unknown error',
      }));

      dispatch(setExecutedOrders({bids: [], asks: []}));
      dispatch(setMyTrades({bids: [], asks: []}));

    }
};