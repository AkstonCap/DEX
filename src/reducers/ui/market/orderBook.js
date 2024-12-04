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
      return {
        ...state,
        orderBookAsks: action.payload,
      };
    case TYPE.SET_ORDER_BOOK_BIDS:
      return {
        ...state,
        orderBookBids: action.payload,
      };
    case TYPE.SET_ORDER_BOOK:
      return {
        ...state,
        orderBook: action.payload,
      };
    case TYPE.SET_HIGHEST_BID:
      return {
        ...state,
        highestBid: action.payload,
      };
    case TYPE.SET_LOWEST_ASK:
      return {
        ...state,
        lowestAsk: action.payload,
      };
    default:
      return state;
  }
};