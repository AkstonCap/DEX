import * as TYPE from 'actions/types';

const initialState = {
        cancellingOrders: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.ADD_CANCELLING_ORDER:
            console.log('ADD_CANCELLING_ORDER reducer called with state:', state, 'payload:', action.payload);
            return {
                cancellingOrders: [...(state.cancellingOrders || []), {
                    txid: action.payload.txid,
                    cancellationTxid: action.payload.cancellationTxid,
                    timestamp: Date.now() / 1000
                }]
            };
        
        case TYPE.REMOVE_CANCELLING_ORDER:
            console.log('REMOVE_CANCELLING_ORDER reducer called with state:', state, 'payload:', action.payload);
            return {
                cancellingOrders: (state.cancellingOrders || []).filter(order => order.txid !== action.payload.txid)
            };
            
        default:
            return state;
    }
};
