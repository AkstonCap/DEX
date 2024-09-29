import { combineReducers } from 'redux';

import inputValueReducer from './inputValue';

export default combineReducers({
  ui: inputValueReducer,
});
