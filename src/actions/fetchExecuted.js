import {
  setExecutedOrders,
  setMyTrades,
} from './actionCreators';
import {
  showErrorDialog
} from 'nexus-module';
import apiCallWithRetry from '../utils/apiCallWithRetry';

// Time span keys as offered by the Overview dropdown, mapped to the core's
// `since()` syntax. Note `1m` means one month here - the previous chain of
// if/else branches declared it twice and the "1 minute" branch was dead code.
const TIME_SPAN_QUERIES = {
  all: '',
  '1y': 'results.timestamp>since(`1 year`);',
  '1mo': 'results.timestamp>since(`1 month`);',
  '1m': 'results.timestamp>since(`1 month`);',
  '1w': 'results.timestamp>since(`1 week`);',
  '1d': 'results.timestamp>since(`1 day`);',
  '12h': 'results.timestamp>since(`12 hours`);',
  '6h': 'results.timestamp>since(`6 hours`);',
  '1h': 'results.timestamp>since(`1 hour`);',
  '30min': 'results.timestamp>since(`30 minutes`);',
  '15min': 'results.timestamp>since(`15 minutes`);',
  '5min': 'results.timestamp>since(`5 minutes`);',
  '1min': 'results.timestamp>since(`1 minute`);',
};

const DEFAULT_TIME_SPAN_QUERY = TIME_SPAN_QUERIES['1y'];

export const fetchExecuted = (
) => async (
  dispatch,
  getState
) => {
  try {
    const state = getState();
    const marketPair = state.ui.market.marketPairs.marketPair;
    const timeSpan = state.settings.timeSpan;

    const queryString = timeSpan in TIME_SPAN_QUERIES
      ? TIME_SPAN_QUERIES[timeSpan]
      : DEFAULT_TIME_SPAN_QUERY;

    const endpoint = 'market/executed/';
    const params = { marketPair };
    // 'all' asks for the full history, so no time filter is sent at all
    if (queryString) {
      params.queryString = queryString;
    }

    const data = await apiCallWithRetry(endpoint, params);
    if (!data) {
      throw new Error('No data returned from apiCall');
    }

    dispatch(setExecutedOrders(data));
    dispatch(setMyTrades(data.myTrades));
  } catch (error) {
    console.error('Error in fetchExecuted:', error);
    showErrorDialog({
      message: 'Cannot get executed transactions',
      note: error?.message || 'Unknown error',
    });
  }
};
