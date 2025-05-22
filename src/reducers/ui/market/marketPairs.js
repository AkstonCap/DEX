import * as TYPE from 'actions/types';

const initialState = {
  marketPair: 'DIST/NXS',
  baseToken: 'DIST',
  quoteToken: 'NXS',
  baseTokenMaxsupply: 1e7,
  quoteTokenMaxsupply: 0,
  baseTokenCirculatingSupply: 0,
  quoteTokenCirculatingSupply: 0,
  baseTokenDecimals: 0,
  quoteTokenDecimals: 8,
  baseTokenAddress: '8DgWXw9dV9BgVNQpKwNZ3zJRbU8SKxjW4j1v9fn8Yma7HihMjeA',
  quoteTokenAddress: '0',
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
        baseTokenAddress: action.payload.baseTokenAddress,
        quoteTokenAddress: action.payload.quoteTokenAddress,
      };

    default:
      return state;
  }
};