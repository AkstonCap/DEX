import * as TYPE from 'actions/types';

const initialState = false;

export default (state = initialState, action) => {
  switch (action.type) {
    case TYPE.SHOW_CONNECTIONS:
      return true;

    case TYPE.HIDE_CONNECTIONS:
      return false;

    default:
      return state;
  }
};
