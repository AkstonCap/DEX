import * as TYPE from 'actions/types';

const initialState = {
  orderBookAsks: [],
  orderBookBids: [],
  orderBook: [],
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
    default:
      return state;
  }
};