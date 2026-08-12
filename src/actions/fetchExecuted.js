import { 
  setExecutedOrders,
  setMyTrades,
  removeUnconfirmedTrade,
} from './actionCreators';
import { 
  showErrorDialog 
} from 'nexus-module';
import apiCallWithRetry from '../utils/apiCallWithRetry';

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
    const quoteToken = state.ui.market.marketPairs.quoteToken;
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
    } else if (timeSpan === '12h') {
      queryString = 'results.timestamp>since(`12 hours`);';
    } else if (timeSpan === '6h') {
      queryString = 'results.timestamp>since(`6 hours`);';
    } else if (timeSpan === '1h') {
      queryString = 'results.timestamp>since(`1 hour`);';
    } else if (timeSpan === '30m') {
      queryString = 'results.timestamp>since(`30 minutes`);';
    } else if (timeSpan === '15m') {
      queryString = 'results.timestamp>since(`15 minutes`);';
    } else if (timeSpan === '5m') {
      queryString = 'results.timestamp>since(`5 minutes`);';
    } else if (timeSpan === '1m') {
      queryString = 'results.timestamp>since(`1 minute`);';
    }

    const endpoint = 'market/executed/';
    const params = {
      marketPair,
      queryString,
    };

    const data = await apiCallWithRetry(endpoint, params);
    if (!data) {
      throw new Error('No data returned from apiCall');
    }

    dispatch(setExecutedOrders(data));
    dispatch(setMyTrades(data.myTrades));
    dispatch(removeUnconfirmedTrade());
  } catch (error) {
    console.error('Error in fetchExecuted:', error);
    showErrorDialog('Cannot get executed transactions', error?.message || 'Unknown error');
  }
};