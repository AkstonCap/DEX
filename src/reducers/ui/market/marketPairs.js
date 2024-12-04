import * as TYPE from 'actions/types';

const initialState = {
  orderToken: 'DIST',
  baseToken: 'NXS',
  marketPair: 'DIST/NXS',
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_MARKET_PAIR:
      return action.payload;
      
    case TYPE.SET_ORDER_TOKEN:
      return action.payload;

    case TYPE.SET_BASE_TOKEN:
      return action.payload;
    
    default:
      return state;
  }
};