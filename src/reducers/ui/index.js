import { combineReducers } from 'redux';

import inputValueReducer from './inputValue';
import marketReducer from './market';

export default combineReducers({
  ui: inputValueReducer,
  market: marketReducer,
});
