import * as TYPE from 'actions/types';

const initialState = {
        executed: [],

};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_MY_TRADES:
            return {
                    executed: action.payload.executed || [],
            };
            
        default:
            return state;
    }
};