import * as TYPE from 'actions/types';

const initialState = {
  baseTokenField: 'NXS',
  orderTokenField: 'DIST',
};

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_BASE_TOKEN_FIELD:
      return {
        ...state,
        baseTokenField: action.payload,
      };

    case TYPE.SET_ORDER_TOKEN_FIELD:
      return {
        ...state,
        orderTokenField: action.payload,
      };

    default:
      return state;
  }
};