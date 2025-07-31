import * as TYPE from 'actions/types';

const initialState = {
        unconfirmedTrades: [],
};

export default (state = initialState, action) => {
    switch (action.type) {
        case TYPE.SET_MY_UNCONFIRMEDTRADES:
            return {
                unconfirmedTrades: action.payload.unconfirmedTrades || [],     
            };
        
        case TYPE.ADD_UNCONFIRMED_TRADE:
            return {
                unconfirmedTrades: [...(state.unconfirmedTrades || []), action.payload]
            };
        
        case TYPE.REMOVE_UNCONFIRMED_TRADE:
            return {
                unconfirmedTrades: (state.unconfirmedTrades || []).filter(trade => trade.txid !== action.payload.txid)
            };
            
        default:
            return state;
    }
};
