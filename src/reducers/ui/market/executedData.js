import * as TYPE from 'actions/types';

const initialState = {
    executedBids: [],
    executedAsks: [],
    executedOrders: [],
    /*lastPrice: 'N/A',
    baseTokenVolume: 'N/A',
    orderTokenVolume: 'N/A',
    */
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

            /*
        case TYPE.SET_LAST_PRICE:
            return {
                ...state,
                lastPrice: action.payload,
            };

        case TYPE.SET_BASE_TOKEN_VOLUME:
            return {
                ...state,
                baseTokenVolume: action.payload,
            };

        case TYPE.SET_ORDER_TOKEN_VOLUME:
            return {
                ...state,
                orderTokenVolume: action.payload,
            };
*/
            
        default:
            return state;
    }
};