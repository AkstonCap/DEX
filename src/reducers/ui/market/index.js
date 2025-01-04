import { combineReducers } from 'redux';

import marketPairs from './marketPairs';
import orderBook from './orderBook';
import executedOrders from './executedOrders';
import orderInQuestion from './orderInQuestion';
import myTrades from './myTrades';
import myOrders from './myOrders';

export default combineReducers({
  marketPairs,
  orderBook,
  executedOrders,
  orderInQuestion,
  myTrades,
  myOrders,
});
