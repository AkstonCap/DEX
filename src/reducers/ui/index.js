import { combineReducers } from 'redux';

import activeTab from './activeTab';
import inputValue from './inputValue';
import market from './market';

export default combineReducers({
  activeTab,
  inputValue,
  market,
});
