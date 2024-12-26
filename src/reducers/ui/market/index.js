import { combineReducers } from 'redux';

import marketPairs from './marketPairs';
import orderBook from './orderBook';
import executedData from './executedData';
import orderInQuestion from './orderInQuestion';
import myTrades from './myTrades';
import myOrders from './myOrders';

export default combineReducers({
  marketPairs,
  orderBook,
  executedData,
  orderInQuestion,
  myTrades,
  myOrders,
});
