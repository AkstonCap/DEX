/** @jest-environment node */

import configureStore from '../src/configureStore';
import { INITIALIZE, stateMiddleware, updateStorage } from 'nexus-module';
import { getPersistence } from '../src/swap/persistence';
import { SET_TIMESPAN, SWITCH_TAB } from '../src/actions/types';

// Replace only the wallet host boundary; exercise the real Redux reducers,
// configureStore middleware and shared persistence queue together.
jest.mock('nexus-module', () => ({
  ...jest.requireActual('../test/__mocks__/nexus-module'),
  updateStorage: jest.fn(),
  walletDataReducer: (state = { initialized: false }, action) =>
    action.type === '@@NWM/INITIALIZE' ? { ...state, initialized: true } : state,
}));

const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const initialJournal = { version: 1, jobs: [{ id: 'pending-job', state: 'submission_unknown' }] };

function initialize() {
  const store = configureStore();
  store.dispatch({
    type: INITIALIZE,
    payload: {
      moduleState: {},
      storageData: { settings: { timeSpan: '1d' }, swapJournal: initialJournal },
    },
  });
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
  global.NEXUS = { utilities: {} };
});

afterEach(() => {
  delete global.NEXUS;
});

test('session persistence preserves master memoization and excludes transient order state', () => {
  const store = initialize();
  const select = stateMiddleware.mock.calls[0][0];
  const initial = store.getState();
  const session = select(initial);
  const transient = ['myUnconfirmedOrders', 'myCancellingOrders', 'myUnconfirmedTrades'];
  for (const key of transient) {
    expect(initial.ui.market).toHaveProperty(key);
    expect(session.ui.market).not.toHaveProperty(key);
  }
  expect(select({ ...initial, settings: { timeSpan: '1w' } })).toBe(session);
  store.dispatch({ type: SWITCH_TAB, payload: 'Trade' });
  expect(select(store.getState())).not.toBe(session);
  expect(select(store.getState()).ui.activeTab).toBe('Trade');
});

test('legacy settings save preserves pending jobs while missing storage acknowledgement blocks funding', async () => {
  const store = initialize();
  expect(() => getPersistence().healthy()).toThrow(/acknowledged/);
  store.dispatch({ type: SWITCH_TAB, payload: 'Trade' });
  await flush();
  expect(updateStorage).not.toHaveBeenCalled();
  store.dispatch({ type: SET_TIMESPAN, payload: '1w' });
  await flush();
  expect(updateStorage).toHaveBeenCalledTimes(1);
  expect(updateStorage).toHaveBeenCalledWith({ settings: { timeSpan: '1w' }, swapJournal: initialJournal });
  expect(getPersistence().readJournal()).toEqual(initialJournal);
  store.dispatch({ type: SET_TIMESPAN, payload: '1w' });
  await flush();
  expect(updateStorage).toHaveBeenCalledTimes(1);
});

test('settings writes wait for acknowledged journal writes and cannot erase the latest intent', async () => {
  let acknowledge;
  const writer = jest.fn(() => new Promise(resolve => { acknowledge = resolve; }));
  global.NEXUS.utilities.updateStorageAcknowledged = writer;
  const store = initialize();
  const nextJournal = { version: 1, jobs: [...initialJournal.jobs, { id: 'next-job', state: 'awaiting_signature' }] };
  const pendingWrite = getPersistence().writeJournal(nextJournal);
  await flush();
  expect(writer).toHaveBeenCalledTimes(1);
  store.dispatch({ type: SET_TIMESPAN, payload: '1m' });
  await flush();
  expect(updateStorage).not.toHaveBeenCalled();
  acknowledge(true);
  await pendingWrite;
  await flush();
  expect(updateStorage).toHaveBeenCalledWith({ settings: { timeSpan: '1m' }, swapJournal: nextJournal });
  expect(getPersistence().readJournal()).toEqual(nextJournal);
});
