import * as TYPE from 'actions/types';

const initialState = {
        orders: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_MY_ORDERS:
            return {
                    orders: action.payload.orders || [],
                    
            };
            
        default:
            return state;
    }
};