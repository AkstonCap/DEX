import { combineReducers } from 'redux';

import activeTab from './activeTab';
import inputValueReducer from './inputValue';
import marketReducer from './marketReducer';

export default combineReducers({
  activeTab,
  inputValue: inputValueReducer,
  market: marketReducer,
});
