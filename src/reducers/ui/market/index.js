import { combineReducers } from 'redux';

import marketPairs from './marketPairs';
import orderBook from './orderBook';
import executedData from './executedData';
import orderInQuestion from './orderInQuestion';

export default combineReducers({
  marketPairs,
  orderBook,
  executedData,
  orderInQuestion,
});
