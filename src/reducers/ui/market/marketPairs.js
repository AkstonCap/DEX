import * as TYPE from 'actions/types';

const initialState = {
  orderToken: 'DIST',
  baseToken: 'NXS',
  marketPair: 'DIST/NXS',
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_MARKET_PAIR:
      return {
        ...state,
        marketPair: action.payload.marketPair,
        orderToken: action.payload.orderToken,
        baseToken: action.payload.baseToken,
      };

    default:
      return state;
  }
};