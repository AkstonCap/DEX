import * as TYPE from 'actions/types';

const initialState = {
  baseTokenField: '',
  orderTokenField: '',
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_BASE_TOKEN_FIELD:
      return action.payload;
      
    case TYPE.SET_ORDER_TOKEN_FIELD:
      return action.payload;
      
    default:
      return state;
  }
};