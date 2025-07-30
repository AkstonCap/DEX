import * as TYPE from 'actions/types';

const initialState = {
        unconfirmedOrders: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_MY_UNCONFIRMEDORDERS:
            return {
                unconfirmedOrders: action.payload.unconfirmedOrders || [],     
            };
        
        case TYPE.ADD_UNCONFIRMED_ORDER:
            //console.log('ADD_UNCONFIRMED_ORDER reducer called with state:', state, 'payload:', action.payload);
            return {
                unconfirmedOrders: [...(state.unconfirmedOrders || []), action.payload]
            };
        
        case TYPE.REMOVE_UNCONFIRMED_ORDER:
            //console.log('REMOVE_UNCONFIRMED_ORDER reducer called with state:', state, 'payload:', action.payload);
            return {
                unconfirmedOrders: (state.unconfirmedOrders || []).filter(order => order.txid !== action.payload.txid)
            };
            
        default:
            return state;
    }
};