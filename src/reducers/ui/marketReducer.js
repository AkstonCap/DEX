import { SET_MARKET_PAIR, SET_ORDER_TOKEN, SET_BASE_TOKEN } from 'actions/types';

const initialState = {
  orderToken: 'DIST',
  baseToken: 'NXS',
  marketPair: 'DIST/NXS',
};

const marketReducer = (state = initialState, action) => {
  switch (action.type) {
    case SET_MARKET_PAIR:
      return {
        ...state,
        marketPair: action.payload,
      };
    case SET_ORDER_TOKEN:
      return {
        ...state,
        orderToken: action.payload,
        marketPair: `${action.payload}/${state.baseToken}`,
      };
    case SET_BASE_TOKEN:
      return {
        ...state,
        baseToken: action.payload,
        marketPair: `${state.orderToken}/${action.payload}`,
      };
    // other cases
    default:
      return state;
  }
};

export default marketReducer;