import { createStore, compose, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import createReducer from './reducers';
import { storageMiddleware, stateMiddleware } from 'nexus-module';

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

const selectStoredData = memoizeBySource(
  (state) => state.settings,
  (settings) => ({ settings })
);

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
  //Middlewares will automatically save when the state as changed,
  //ie state.settings will be stored on disk and will save every time state.settings is changed.
  const middlewares = [
    storageMiddleware(selectStoredData), //Data saved to disk
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
