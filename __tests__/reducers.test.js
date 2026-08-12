/**
 * Regression tests for the Redux state layer.
 *
 * These cover the two bugs that made state restored from a previous session
 * unsafe to read: the shallow merge on INITIALIZE, and reducers dropping the
 * `error` field that the order/trade tables render.
 */

import { INITIALIZE } from 'nexus-module';
import createReducer, { mergePersistedState } from '../src/reducers';
import myOrders from '../src/reducers/ui/market/myOrders';
import myTrades from '../src/reducers/ui/market/myTrades';
import myUnconfirmedTrades from '../src/reducers/ui/market/myUnconfirmedTrades';
import * as TYPE from '../src/actions/types';

describe('mergePersistedState', () => {
  test('keeps reducer defaults for keys the persisted blob does not carry', () => {
    const base = { ui: { activeTab: 'Overview', nft: { listings: [] } } };
    const persisted = { ui: { activeTab: 'Trade' } };

    const merged = mergePersistedState(base, persisted);

    expect(merged.ui.activeTab).toBe('Trade');
    expect(merged.ui.nft).toEqual({ listings: [] });
  });

  test('merges nested slices instead of replacing them', () => {
    const base = { ui: { market: { orderBook: { bids: [], asks: [] }, myUnconfirmedOrders: { unconfirmedOrders: [] } } } };
    const persisted = { ui: { market: { orderBook: { bids: [1], asks: [2] } } } };

    const merged = mergePersistedState(base, persisted);

    expect(merged.ui.market.orderBook).toEqual({ bids: [1], asks: [2] });
    expect(merged.ui.market.myUnconfirmedOrders).toEqual({ unconfirmedOrders: [] });
  });

  test('replaces arrays wholesale rather than merging them by index', () => {
    const merged = mergePersistedState({ list: [1, 2, 3] }, { list: [9] });
    expect(merged.list).toEqual([9]);
  });
});

describe('root reducer INITIALIZE', () => {
  test('restored session state never drops a newer reducer slice', () => {
    const reducer = createReducer();
    const initial = reducer(undefined, { type: '@@INIT' });

    // A session snapshot taken before the nft slice existed
    const restored = reducer(initial, {
      type: INITIALIZE,
      payload: {
        moduleState: { ui: { activeTab: 'Trade' } },
        storageData: { settings: { timeSpan: '1d' } },
      },
    });

    expect(restored.ui.activeTab).toBe('Trade');
    expect(restored.settings.timeSpan).toBe('1d');
    // Would have been undefined with a shallow spread, crashing the NFT tab
    expect(restored.ui.nft).toBeDefined();
    expect(restored.ui.nft.listings).toEqual([]);
    expect(restored.ui.market.marketPairs).toBeDefined();
  });
});

describe('market reducers', () => {
  test('myOrders keeps the error the order table renders', () => {
    const state = myOrders(undefined, {
      type: TYPE.SET_MY_ORDERS,
      payload: { orders: [], error: 'Unable to load orders' },
    });
    expect(state.error).toBe('Unable to load orders');
  });

  test('myTrades reads executed and tolerates a missing payload', () => {
    expect(myTrades(undefined, { type: TYPE.SET_MY_TRADES, payload: undefined }).executed).toEqual([]);
    expect(
      myTrades(undefined, { type: TYPE.SET_MY_TRADES, payload: { executed: [{ txid: 'a' }] } }).executed
    ).toHaveLength(1);
  });

  test('removing an unconfirmed trade without a txid is a no-op', () => {
    const populated = {
      unconfirmedTrades: [{ txid: 'a' }, { timestamp: 1 }],
    };
    const next = myUnconfirmedTrades(populated, {
      type: TYPE.REMOVE_UNCONFIRMED_TRADE,
      payload: { txid: undefined },
    });
    expect(next).toBe(populated);
  });

  test('removing an unconfirmed trade by txid drops only that trade', () => {
    const next = myUnconfirmedTrades(
      { unconfirmedTrades: [{ txid: 'a' }, { txid: 'b' }] },
      { type: TYPE.REMOVE_UNCONFIRMED_TRADE, payload: { txid: 'a' } }
    );
    expect(next.unconfirmedTrades).toEqual([{ txid: 'b' }]);
  });
});
