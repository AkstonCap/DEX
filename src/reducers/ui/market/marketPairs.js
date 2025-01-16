import * as TYPE from 'actions/types';

const initialState = {
  baseToken: 'DIST',
  quoteToken: 'NXS',
  marketPair: 'DIST/NXS',
  baseTokenMaxsupply: 1e7,
  quoteTokenMaxsupply: 0,
  baseTokenCirculatingSupply: 0,
  quoteTokenCirculatingSupply: 0,
  baseTokenDecimals: 0,
  quoteTokenDecimals: 8,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_MARKET_PAIR:
      return {
        ...state,
        marketPair: action.payload.marketPair,
        baseToken: action.payload.baseToken,
        quoteToken: action.payload.quoteToken,
        baseTokenMaxsupply: action.payload.baseTokenMaxsupply,
        quoteTokenMaxsupply: action.payload.quoteTokenMaxsupply,
        baseTokenCirculatingSupply: action.payload.baseTokenCirculatingSupply,
        quoteTokenCirculatingSupply: action.payload.quoteTokenCirculatingSupply,
        baseTokenDecimals: action.payload.baseTokenDecimals,
        quoteTokenDecimals: action.payload.quoteTokenDecimals,
      };

    default:
      return state;
  }
};