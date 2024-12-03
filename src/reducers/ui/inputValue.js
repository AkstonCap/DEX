import * as TYPE from 'actions/types';

const initialState = {
  inputBaseToken: '',
  inputOrderToken: '',
};

const inputValueReducer = (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SET_BASE_TOKEN_FIELD:
      return {
        ...state,
        inputBaseToken: action.payload,
      };
    case TYPE.SET_ORDER_TOKEN_FIELD:
      return {
        ...state,
        inputOrderToken: action.payload,
      };
    default:
      return state;
  }
};

export default inputValueReducer;