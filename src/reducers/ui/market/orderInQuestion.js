import * as TYPE from 'actions/types';

const initialState = {
  address: '',
  price: 0,
  amount: 0,
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_ORDER:
      return {
        ...state,
        address: action.payload.address,
        price: action.payload.price,
        amount: action.payload.amount,
      };

    default:
      return state;
  }
};