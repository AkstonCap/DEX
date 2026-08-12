import * as TYPE from 'actions/types';

const initialState = {
  txid: '',
  price: 0,
  amount: 0,
  type: '',
  marketPair: '',
  orderMethod: 'bid',
  availableOrders: [],
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

    case TYPE.SET_AVAILABLE_ORDERS_AT_PRICE:
      return {
        ...state,
        availableOrders: action.payload.orders,
        price: action.payload.price,
        type: action.payload.type,
        orderMethod: 'execute',
        txid: '',
        amount: 0,
      };

    default:
      return state;
  }
};