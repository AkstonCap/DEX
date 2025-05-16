import * as TYPE from 'actions/types';

const initialState = {
        unconfirmedorders: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_MY_UNCONFIRMEDORDERS:
            return {
                unconfirmedOrders: action.payload.unconfirmedOrders || [],     
            };
            
        default:
            return state;
    }
};