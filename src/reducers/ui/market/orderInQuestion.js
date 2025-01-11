import * as TYPE from 'actions/types';

const initialState = {
  txid: '',
  price: 0,
  amount: 0,
  type: '',
  marketPair: '',
  orderMethod: 'bid',
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_ORDER:
      return {
        ...state,
        txid: action.payload.txid,
        price: action.payload.price,
        amount: action.payload.amount,
        type: action.payload.type,
        marketPair: action.payload.marketPair,
        orderMethod: action.payload.orderMethod,
      };

    default:
      return state;
  }
};