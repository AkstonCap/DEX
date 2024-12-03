import * as TYPE from 'actions/types';

const initialState = {
  inputBaseToken: '',
  inputOrderToken: '',
};

const inputValueReducer = (state = initialState, action) => {
  switch (action.type) {
    case TYPE.UPDATE_INPUT_BASE_TOKEN:
      return {
        ...state,
        inputBaseToken: action.payload,
      };
    case TYPE.UPDATE_INPUT_ORDER_TOKEN:
      return {
        ...state,
        inputOrderToken: action.payload,
      };
    default:
      return state;
  }
};

export default inputValueReducer;