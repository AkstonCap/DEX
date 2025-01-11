import * as TYPE from 'actions/types';

const initialState = '1y';

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_TIMESPAN:
            return action.payload || '1y';
        default:
            return state;
    }
};