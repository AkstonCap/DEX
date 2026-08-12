import * as TYPE from 'actions/types';

const initialState = {
        orders: [],
        error: null,
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_MY_ORDERS:
            return {
                orders: action.payload.orders || [],
                // PersonalOpenOrders renders this when the orders endpoint fails
                error: action.payload.error || null,
            };

        default:
            return state;
    }
};
