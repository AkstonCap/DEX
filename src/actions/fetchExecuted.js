import { 
  setExecutedOrders,
  setMyTrades,
} from './actionCreators';
import { 
  showErrorDialog, 
  apiCall 
} from 'nexus-module';

export const fetchExecuted = (
) => async (
  dispatch,
  getState
) => {
  try {
    //const pair = inputMarket;
    //const baseToken = pair.split('/')[0];
    const state = getState();
    const marketPair = state.ui.market.marketPairs.marketPair;
    const baseToken = state.ui.market.marketPairs.baseToken;
    const timeSpan = state.settings.timeSpan;
    //const timestampMin = Date.now()/1000 - 60*60*24*365; // 1 year
    let queryString = 'results.timestamp>since(`1 year`);';
    if (timeSpan === '1y') {
      queryString = 'results.timestamp>since(`1 year`);';
    } else if (timeSpan === '1m') {
      queryString = 'results.timestamp>since(`1 month`);';
    } else if (timeSpan === '1w') {
      queryString = 'results.timestamp>since(`1 week`);';
    } else if (timeSpan === '1d') {
      queryString = 'results.timestamp>since(`1 day`);';
    } else {
      queryString = '';
    }
     
    const data1 = await apiCall( 
      'market/list/executed/timestamp,price,type,contract.amount,contract.ticker,order.amount,order.ticker', 
      {
        market: marketPair,
        sort: 'timestamp', 
        order: 'desc', 
        limit: 100,
        where: queryString,
      }
    ).catch((error) => {
      dispatch(showErrorDialog({
        message: 'Cannot get executed transactions from apiCall (fetchExecuted)',
        note: error?.message || 'Unknown error',
      }));
      const data={bids: [], asks: []};
      dispatch(setExecutedOrders(data));
    });

    if ( data1.bids?.length !== 0) {
      data1.bids.forEach((element) => {
        if (element.contract.ticker === 'NXS') {
          element.contract.amount = element.contract.amount / 1e6;
        } else if (element.order.ticker === 'NXS') {
          element.order.amount = element.order.amount / 1e6;
        }
      });
      data1.bids.forEach((element) => {
        if (element.price !== (element.contract.amount / element.order.amount)) {
          element.price = (element.contract.amount / element.order.amount);
        }
      });
    }

    if ( data1.asks?.length !== 0) {
      data1.asks.forEach((element) => {
        if (element.contract.ticker === 'NXS') {
          element.contract.amount = element.contract.amount / 1e6;
        } else if (element.order.ticker === 'NXS') {
          element.order.amount = element.order.amount / 1e6;
        }
      });
      data1.asks.forEach((element) => {
        if (element.price !== (element.order.amount / element.contract.amount)) {
          element.price = (element.order.amount / element.contract.amount);
        }
      });
    }

    dispatch(setExecutedOrders(data1));

    const myTrades = await apiCall(
      'market/user/executed', 
      {
        token: baseToken,
        sort: 'timestamp', 
        order: 'desc', 
        limit: 10
      }
    ).catch((error) => {
      dispatch(showErrorDialog({
        message: 'Cannot get my trades from apiCall (fetchExecuted)',
        note: error?.message || 'Unknown error',
      }));
      const trades={bids: [], asks: []};
      dispatch(setMyTrades(trades));
    });

    if (!myTrades.bids) {
      myTrades.bids = [];
    }
    if (!myTrades.asks) {
      myTrades.asks = [];
    }

    dispatch(setMyTrades(myTrades));

  } catch (error) {
    dispatch(showErrorDialog({
      message: 'Cannot get executed transactions (fetchExecuted)',
      note: error?.message || 'Unknown error',
    }));

    dispatch(setExecutedOrders({ bids: [], asks: [] }));
    dispatch(setMyTrades({ bids: [], asks: [] }));
  }
};