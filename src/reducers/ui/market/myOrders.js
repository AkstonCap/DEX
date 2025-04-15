import * as TYPE from 'actions/types';

const initialState = {
        orders: [],
        unconfirmedOrders: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_MY_ORDERS:
            return {
                    orders: action.payload.orders || [],
                    
            };
        case TYPE.ADD_UNCONFIRMED_ORDER:
            return {
                    ...state,
                    unconfirmedOrders: [
                            ...state.unconfirmedOrders,
                            {
                                    txid: action.payload.txid,
                                    price: action.payload.price,
                                    amount: action.payload.amount,
                                    type: action.payload.type,
                                    marketPair: action.payload.marketPair,
                            },
                    ],
            };
        case TYPE.REMOVE_UNCONFIRMED_ORDER:
            return {
                    ...state,
                    unconfirmedOrders: state.unconfirmedOrders.filter(
                            (order) => order.txid !== action.payload
                    ),
            };
            
        default:
            return state;
    }
};