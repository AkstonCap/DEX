/**
 * Regression tests for the executed-trades thunk.
 *
 * The time span used to be resolved by a long if/else chain that declared '1m'
 * twice, so the second branch was unreachable and 'all' fell through to the
 * one-year default.
 */

import { apiCall } from 'nexus-module';
import { fetchExecuted } from '../src/actions/fetchExecuted';
import * as TYPE from '../src/actions/types';

const makeStore = (timeSpan) => {
  const dispatched = [];
  const getState = () => ({
    ui: { market: { marketPairs: { marketPair: 'DIST/NXS' } } },
    settings: { timeSpan },
  });
  const dispatch = (action) => {
    dispatched.push(action);
    return action;
  };
  return { dispatch, getState, dispatched };
};

const runFetch = async (timeSpan) => {
  const store = makeStore(timeSpan);
  await fetchExecuted()(store.dispatch, store.getState);
  return store;
};

describe('fetchExecuted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    apiCall.mockResolvedValue({ bids: [], asks: [], myTrades: { executed: [] } });
  });

  test("'1m' asks for one month, not one minute", async () => {
    await runFetch('1m');
    expect(apiCall).toHaveBeenCalledWith(
      'market/executed/',
      expect.objectContaining({ queryString: 'results.timestamp>since(`1 month`);' })
    );
  });

  test("'all' sends no time filter at all", async () => {
    await runFetch('all');
    const params = apiCall.mock.calls[0][1];
    expect(params.queryString).toBeUndefined();
    expect(params.marketPair).toBe('DIST/NXS');
  });

  test('an unknown time span falls back to one year', async () => {
    await runFetch('not-a-span');
    expect(apiCall).toHaveBeenCalledWith(
      'market/executed/',
      expect.objectContaining({ queryString: 'results.timestamp>since(`1 year`);' })
    );
  });

  test('dispatches executed orders and trades, and no blanket trade removal', async () => {
    const { dispatched } = await runFetch('1y');
    const types = dispatched.map((action) => action.type);

    expect(types).toContain(TYPE.SET_EXECUTED_ORDERS);
    expect(types).toContain(TYPE.SET_MY_TRADES);
    // Used to fire REMOVE_UNCONFIRMED_TRADE with an undefined txid on every poll
    expect(types).not.toContain(TYPE.REMOVE_UNCONFIRMED_TRADE);
  });
});
