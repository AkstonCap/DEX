import { combineReducers } from 'redux';

import inputValueReducer from './inputValue';
import marketReducer from './marketReducer';

export default combineReducers({
  ui: inputValueReducer,
  market: marketReducer,
});
