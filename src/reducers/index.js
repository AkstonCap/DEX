import { INITIALIZE } from 'nexus-module';
import { combineReducers } from 'redux';
import { walletDataReducer } from 'nexus-module';

import inputValueReducer from './inputValue';
import marketReducer from './marketReducer';

export default function rootReducer() {
  return function (state, action) {
    const baseReducer = combineReducers({
      ui: inputValueReducer,
      market: marketReducer,
      nexus: walletDataReducer,
    });
    const newState = baseReducer(state, action);

    if (action.type === INITIALIZE) {
      const { storageData, moduleState } = action.payload;
      if (storageData || moduleState) {
        return {
          ...newState,
          ...action.payload.storageData,
          ...action.payload.moduleState,
        };
      }
    }

    return newState;
  };
}
