import * as TYPE from 'actions/types';

const initialState = '';

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.UPDATE_INPUT:
      return action.payload;

    default:
      return state;
  }
};
