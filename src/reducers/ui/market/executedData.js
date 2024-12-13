import * as TYPE from 'actions/types';

const initialState = {
        bids: [],
        asks: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_EXECUTED_ORDERS:
            return {
                    bids: action.payload.bids || [],
                    asks: action.payload.asks || [],
            };
            
        default:
            return state;
    }
};