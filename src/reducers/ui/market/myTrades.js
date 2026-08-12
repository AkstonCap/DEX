import * as TYPE from 'actions/types';

const initialState = {
        executed: [],
        error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_MY_TRADES:
            return {
                executed: action.payload?.executed || [],
                // PersonalTradeHistory renders this when the trades endpoint fails
                error: action.payload?.error || null,
            };

        default:
            return state;
    }
};
