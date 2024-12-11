import * as TYPE from 'actions/types';

const initialState = 'Overview'; // Set your default tab here

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.UPDATE_INPUT:
      return {
        ...state,
        orderToken: action.payload.orderTokenField,
        baseToken: action.payload.baseTokenField,
      };
    default:
      return state;
  }
};