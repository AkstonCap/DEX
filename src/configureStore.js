/* global NEXUS */
import { createStore, compose, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import createReducer from './reducers';
import { INITIALIZE, updateStorage, stateMiddleware } from 'nexus-module';
import { installPersistence } from './swap/persistence';

// Order state that only makes sense for the current session is kept out of the
// persisted snapshot, so a restart never resurrects stale pending orders.
const TRANSIENT_MARKET_KEYS = [
  'myUnconfirmedOrders',
  'myCancellingOrders',
  'myUnconfirmedTrades',
];

/**
 * nexus-module's persistence middlewares compare the selected data by reference
 * and write to disk / send an IPC message whenever it changes. Rebuilding the
 * object on every call made that comparison always fail, so every dispatched
 * action triggered a write. Caching on the source slice keeps the identity
 * stable until the slice itself actually changes.
 */
function memoizeBySource(getSource, build) {
  let lastSource;
  let lastResult;
  let hasResult = false;

  return (state) => {
    const source = getSource(state);
    if (hasResult && source === lastSource) {
      return lastResult;
    }
    lastSource = source;
    lastResult = build(source);
    hasResult = true;
    return lastResult;
  };
}

const selectSessionState = memoizeBySource(
  (state) => state.ui,
  (ui) => {
    if (!ui || !ui.market) {
      return { ui };
    }

    const market = { ...ui.market };
    TRANSIENT_MARKET_KEYS.forEach((key) => {
      delete market[key];
    });

    return { ui: { ...ui, market } };
  }
);

export default function configureStore() {
  // Current Nexus Interface updateStorage is fire-and-forget. The acknowledged
  // extension below is a REQUIRED FUTURE host capability, not an existing SDK API.
  // See docs/CROSS_CHAIN_SWAPS.md; legacy settings retain their existing writer.
  const persistence = installPersistence(NEXUS.utilities.updateStorageAcknowledged,
    {writeSettings: updateStorage});
  const persistentData = store => next => action => {
    const previousSettings = store.getState()?.settings;
    const result = next(action);
    if (action.type === INITIALIZE) {
      persistence.hydrate(action.payload.storageData || {});
    } else if (store.getState().nexus?.initialized && previousSettings !== store.getState().settings) {
      persistence.saveSettings(store.getState().settings).catch(error => {
        console.error('Wallet storage failed; new swap funding is blocked.', error.message);
      });
    }
    return result;
  };
  //Middlewares will automatically save when the state as changed,
  //ie state.settings will be stored on disk and will save every time state.settings is changed.
  const middlewares = [
    persistentData, // Serialized settings + acknowledged swap journal; never erase pending jobs.
    stateMiddleware(selectSessionState), //Data saved to session
    thunk,
  ];
  const enhancers = [applyMiddleware(...middlewares)];

  const composeEnhancers = compose; // Disable Redux DevTools to prevent serialization errors

  const store = createStore(createReducer(), composeEnhancers(...enhancers));

  if (module.hot) {
    module.hot.accept('./reducers', () => {
      store.replaceReducer(createReducer());
    });
  }

  return store;
}
