import * as TYPE from 'actions/types';

const initialState = {
  orderBook: {
    asks: [],
    bids: [],
  },
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_ORDER_BOOK:
      return {
        ...state,
        orderBook: {
        asks: action.payload.asks || [],
        bids: action.payload.bids || [],
        },
      };
    default:
      return state;
  }
};