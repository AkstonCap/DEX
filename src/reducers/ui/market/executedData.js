import * as TYPE from 'actions/types';

const initialState = {
    executedBids: [],
    executedAsks: [],
    executedOrders: [],
    lastPrice: 'N/A',
    baseTokenVolume: 'N/A',
    orderTokenVolume: 'N/A',
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_EXECUTED_BIDS:
            return action.payload;

        case TYPE.SET_EXECUTED_ASKS:
            return action.payload;

        case TYPE.SET_EXECUTED_ORDERS:
            return action.payload;

        case TYPE.SET_LAST_PRICE:
            return action.payload;

        case TYPE.SET_BASE_TOKEN_VOLUME:
            return action.payload;

        case TYPE.SET_ORDER_TOKEN_VOLUME:
            return action.payload;
    
        default:
            return state;
    }
};