import { INITIALIZE } from 'nexus-module';
import { combineReducers } from 'redux';
import { walletDataReducer } from 'nexus-module';

import ui from './ui';
import settings from './settings';

export default function createReducer() {
  return function (state, action) {
    const baseReducer = combineReducers({
      ui,
      settings,
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
