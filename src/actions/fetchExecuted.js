import {
  setExecutedOrders,
  setMyTrades,
} from './actionCreators';
import {
  showErrorDialog,
  apiCall,
} from 'nexus-module';
import apiCallWithRetry from '../utils/apiCallWithRetry';
import { normalizeMarketSides, normalizeMarketEntries } from '../utils/marketData';

// Time span keys as offered by the Overview dropdown, in seconds. `1m` means
// one month here - the previous if/else chain declared it twice and the
// "1 minute" branch was unreachable.
//
// The filter is expressed as a numeric Unix timestamp rather than the core's
// since(`1 year`) helper: this core build rejects that form with
// "unknown variable: results.timestamp>since". The numeric comparison is what
// ChartWindow and portfolio already use successfully.
const TIME_SPAN_SECONDS = {
  all: null, // no time filter at all
  '1y': 365 * 24 * 60 * 60,
  '1mo': 30 * 24 * 60 * 60,
  '1m': 30 * 24 * 60 * 60,
  '1w': 7 * 24 * 60 * 60,
  '1d': 24 * 60 * 60,
  '12h': 12 * 60 * 60,
  '6h': 6 * 60 * 60,
  '1h': 60 * 60,
  '30min': 30 * 60,
  '15min': 15 * 60,
  '5min': 5 * 60,
  '1min': 60,
};

const DEFAULT_TIME_SPAN = '1y';

// Matches the core's default page size. Raise it (and page) if the Overview
// volume/high/low figures need to cover more than the most recent trades.
const EXECUTED_LIMIT = 100;

const EXECUTED_FIELDS =
  'txid,timestamp,type,price,contract.amount,contract.ticker,order.amount,order.ticker';

/**
 * Build the `where` filter for a time span, or null for no filter.
 * Exported for testing.
 */
export const buildTimeSpanFilter = (timeSpan, now = Math.floor(Date.now() / 1000)) => {
  const seconds = timeSpan in TIME_SPAN_SECONDS
    ? TIME_SPAN_SECONDS[timeSpan]
    : TIME_SPAN_SECONDS[DEFAULT_TIME_SPAN];

  if (!seconds) return null;
  return `results.timestamp>${now - seconds}`;
};

export const fetchExecuted = (
) => async (
  dispatch,
  getState
) => {
  const state = getState();
  const marketPair = state.ui.market.marketPairs.marketPair;
  const baseToken = state.ui.market.marketPairs.baseToken;
  const quoteToken = state.ui.market.marketPairs.quoteToken;
  const timeSpan = state.settings.timeSpan;

  if (!marketPair || typeof marketPair !== 'string') {
    return;
  }

  const where = buildTimeSpanFilter(timeSpan);

  const params = {
    market: marketPair,
    sort: 'timestamp',
    order: 'desc',
    limit: EXECUTED_LIMIT,
  };
  if (where) {
    params.where = where;
  }

  try {
    const data = await apiCallWithRetry(`market/list/executed/${EXECUTED_FIELDS}`, params);
    if (!data) {
      throw new Error('No data returned from apiCall');
    }

    // The core returns NXS amounts in divisible units and an unreliable price
    // field, so executed trades have to be normalized before anything reads
    // them - the Overview headline figures and the trade tables all derive
    // from here.
    dispatch(setExecutedOrders(normalizeMarketSides(data)));
  } catch (error) {
    console.error('Error in fetchExecuted:', error);
    showErrorDialog({
      message: 'Cannot get executed transactions',
      note: error?.message || 'Unknown error',
    });
    return;
  }

  // The user's own trades come from a separate endpoint - the public executed
  // list carries no per-user data. Failing to load them must not take the
  // public trade history down with it, so this is reported into state rather
  // than thrown.
  try {
    // Query by market for NXS pairs, matching fetchOrderBook: a null/invalid
    // token parameter is rejected by the core.
    const myTradesParams = (baseToken === 'NXS' || quoteToken === 'NXS' || !baseToken)
      ? { market: marketPair }
      : { token: baseToken };

    const myTrades = await apiCall('market/user/executed', {
      ...myTradesParams,
      sort: 'timestamp',
      order: 'desc',
      limit: EXECUTED_LIMIT,
    });

    const executed = Array.isArray(myTrades?.executed)
      ? myTrades.executed
      : Array.isArray(myTrades)
        ? myTrades
        : [...(myTrades?.bids || []), ...(myTrades?.asks || [])];

    dispatch(setMyTrades({ executed: normalizeMarketEntries(executed), error: null }));
  } catch (error) {
    console.warn('Cannot get user trades (market/user/executed):', error?.message || error);
    dispatch(setMyTrades({
      executed: [],
      error: error?.message || 'Unable to load your trades',
    }));
  }
};
