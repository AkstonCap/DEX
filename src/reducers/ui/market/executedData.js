import * as TYPE from 'actions/types';

const initialState = {
    executedBids: [],
    executedAsks: [],
    executedOrders: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_EXECUTED_BIDS:
            return {
                ...state,
                executedBids: action.payload,
            };

        case TYPE.SET_EXECUTED_ASKS:
            return {
                ...state,
                executedAsks: action.payload,
            };

        case TYPE.SET_EXECUTED_ORDERS:
            return {
                ...state,
                executedOrders: action.payload,
            };
            
        default:
            return state;
    }
};