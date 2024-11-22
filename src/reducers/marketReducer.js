import { SET_MARKET_PAIR } from 'actions/types';

const initialState = {
  marketPair: 'DIST/NXS',
  // other state properties
};

const marketReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_MARKET_PAIR:
      return {
        ...state,
        marketPair: action.payload,
      };
    // other cases
    default:
      return state;
  }
};

export default marketReducer;