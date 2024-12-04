import * as TYPE from 'actions/types';

const initialState = {
  orderBookAsks: [],
  orderBookBids: [],
  orderBook: [],
  highestBid: 'N/A',
  lowestAsk: 'N/A',
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_ORDER_BOOK_ASKS:
      return action.payload;
      
    case TYPE.SET_ORDER_BOOK_BIDS:
      return action.payload;

    case TYPE.SET_ORDER_BOOK:
      return action.payload;

    case TYPE.SET_HIGHEST_BID:
      return action.payload;

    case TYPE.SET_LOWEST_ASK:
      return action.payload;
    
    default:
      return state;
  }
};