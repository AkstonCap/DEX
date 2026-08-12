/**
 * Regression tests for the executed-trades thunk.
 *
 * Two bugs are pinned here:
 *  - the time span used to be resolved by an if/else chain that declared '1m'
 *    twice, so the second branch was unreachable and 'all' fell through to the
 *    one-year default;
 *  - the request itself used the wrong endpoint and parameter names, and the
 *    core's since(`...`) filter helper, which this core build rejects with
 *    "unknown variable: results.timestamp>since".
 */

import { apiCall } from 'nexus-module';
import { fetchExecuted, buildTimeSpanFilter } from '../src/actions/fetchExecuted';
import * as TYPE from '../src/actions/types';

const NOW = 1_700_000_000;

const makeStore = (timeSpan, marketPairs = {}) => {
  const dispatched = [];
  const getState = () => ({
    ui: {
      market: {
        marketPairs: {
          marketPair: 'DIST/NXS',
          baseToken: 'DIST',
          quoteToken: 'NXS',
          ...marketPairs,
        },
      },
    },
    settings: { timeSpan },
  });
  const dispatch = (action) => {
    dispatched.push(action);
    return action;
  };
  return { dispatch, getState, dispatched };
};

const runFetch = async (timeSpan, marketPairs) => {
  const store = makeStore(timeSpan, marketPairs);
  await fetchExecuted()(store.dispatch, store.getState);
  return store;
};

// The public executed list is always the first call
const executedCall = () => apiCall.mock.calls[0];

describe('buildTimeSpanFilter', () => {
  test('emits a numeric timestamp comparison, never since()', () => {
    const filter = buildTimeSpanFilter('1d', NOW);
    expect(filter).toBe(`results.timestamp>${NOW - 86400}`);
    expect(filter).not.toContain('since');
  });

  test("'1m' is one month, not one minute", () => {
    expect(buildTimeSpanFilter('1m', NOW)).toBe(`results.timestamp>${NOW - 30 * 86400}`);
  });

  test("'all' produces no filter", () => {
    expect(buildTimeSpanFilter('all', NOW)).toBeNull();
  });

  test('an unknown span falls back to one year', () => {
    expect(buildTimeSpanFilter('not-a-span', NOW)).toBe(`results.timestamp>${NOW - 365 * 86400}`);
  });
});

describe('fetchExecuted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiCall.mockResolvedValue({ bids: [], asks: [], executed: [] });
  });

  test('calls market/list/executed with the market and where parameters', async () => {
    await runFetch('1y');
    const [endpoint, params] = executedCall();

    expect(endpoint).toContain('market/list/executed/');
    // The old call used 'market/executed/' with marketPair and queryString
    expect(endpoint).not.toBe('market/executed/');
    expect(params.market).toBe('DIST/NXS');
    expect(params.marketPair).toBeUndefined();
    expect(params.queryString).toBeUndefined();
    expect(params.where).toMatch(/^results\.timestamp>\d+$/);
  });

  test("'all' sends no where filter at all", async () => {
    await runFetch('all');
    expect(executedCall()[1].where).toBeUndefined();
  });

  test('does nothing when there is no market pair', async () => {
    const { dispatched } = await runFetch('1y', { marketPair: '' });
    expect(apiCall).not.toHaveBeenCalled();
    expect(dispatched).toHaveLength(0);
  });

  test('dispatches executed orders and the user trades separately', async () => {
    const { dispatched } = await runFetch('1y');
    const types = dispatched.map((action) => action.type);

    expect(types).toContain(TYPE.SET_EXECUTED_ORDERS);
    expect(types).toContain(TYPE.SET_MY_TRADES);
    // Used to fire REMOVE_UNCONFIRMED_TRADE with an undefined txid on every poll
    expect(types).not.toContain(TYPE.REMOVE_UNCONFIRMED_TRADE);

    // User trades come from their own endpoint; the public list carries none
    expect(apiCall.mock.calls[1][0]).toBe('market/user/executed');
  });

  test('queries user trades by market on an NXS pair', async () => {
    await runFetch('1y');
    expect(apiCall.mock.calls[1][1].market).toBe('DIST/NXS');
    expect(apiCall.mock.calls[1][1].token).toBeUndefined();
  });

  test('queries user trades by token on a token/token pair', async () => {
    await runFetch('1y', { marketPair: 'DIST/USDD', baseToken: 'DIST', quoteToken: 'USDD' });
    expect(apiCall.mock.calls[1][1].token).toBe('DIST');
  });

  test('a failing user-trades call still leaves the public history in place', async () => {
    apiCall
      .mockResolvedValueOnce({ bids: [], asks: [] })
      .mockRejectedValueOnce(new Error('no session'));

    const { dispatched } = await runFetch('1y');
    const setMyTrades = dispatched.find((a) => a.type === TYPE.SET_MY_TRADES);

    expect(dispatched.some((a) => a.type === TYPE.SET_EXECUTED_ORDERS)).toBe(true);
    expect(setMyTrades.payload.executed).toEqual([]);
    expect(setMyTrades.payload.error).toBe('no session');
  });

  test('normalizes NXS amounts and recomputes price on the way into the store', async () => {
    apiCall.mockResolvedValueOnce({
      bids: [{
        type: 'bid',
        price: 999999,
        contract: { amount: 100 * 1e6, ticker: 'NXS' },
        order: { amount: 4, ticker: 'DIST' },
      }],
      asks: [],
    });

    const { dispatched } = await runFetch('1y');
    const executed = dispatched.find((a) => a.type === TYPE.SET_EXECUTED_ORDERS);

    expect(executed.payload.bids[0].contract.amount).toBe(100);
    expect(executed.payload.bids[0].price).toBe(25);
  });
});
