import { createStore, compose, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import createReducer from './reducers';
import { storageMiddleware, stateMiddleware } from 'nexus-module';

export default function configureStore() {
  //Middlewares will automatically save when the state as changed,
  //ie state.settings will be stored on disk and will save every time state.settings is changed.
  const middlewares = [
    storageMiddleware(({ settings }) => ({ settings })), //Data saved to disk
    stateMiddleware(({ ui }) => {
      // Exclude temporary order states from session storage
      if (!ui || !ui.market) {
        return { ui };
      }
      
      const { myUnconfirmedOrders, myCancellingOrders, myUnconfirmedTrades, ...restUiMarket } = ui.market;
      return { 
        ui: {
          ...ui,
          market: {
            ...restUiMarket
          }
        }
      };
    }), //Data saved to session
    thunk
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
