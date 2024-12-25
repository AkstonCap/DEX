import * as TYPE from 'actions/types';

const initialState = {
  baseToken: 'DIST',
  quoteToken: 'NXS',
  marketPair: 'DIST/NXS',
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_MARKET_PAIR:
      return {
        ...state,
        marketPair: action.payload.marketPair,
        baseToken: action.payload.baseToken,
        quoteToken: action.payload.quoteToken,
      };

    default:
      return state;
  }
};