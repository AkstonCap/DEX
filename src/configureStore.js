import { createStore, compose, applyMiddleware } from 'redux';

import rootReducer from './reducers';
import { storageMiddleware, stateMiddleware } from 'nexus-module';

export default function configureStore() {
  //Middlewares will automatically save when the state as changed,
  //ie state.settings will be stored on disk and will save every time state.settings is changed.
  const middlewares = [
    //storageMiddleware(({ settings }) => ({ settings })), //Data saved to disk
    stateMiddleware((state) => ({
      inputValue: state.inputValue,
      market: state.market,
      nexus: state.nexus,
     })), //Data saved to session
  ];
  const enhancers = [applyMiddleware(...middlewares)];

  const composeEnhancers =
    process.env.NODE_ENV !== 'production' &&
    typeof window === 'object' &&
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__
      ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__({
          shouldHotReload: false,
        })
      : compose;

  const store = createStore(rootReducer, composeEnhancers(...enhancers));

  if (module.hot) {
    module.hot.accept('./reducers', () => {
      store.replaceReducer(rootReducer);
    });
  }

  return store;
}
