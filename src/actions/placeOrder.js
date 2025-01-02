import { apiCall, 
    showErrorDialog, 
    showSuccessDialog,
    secureApiCall
} from 'nexus-module';
import { fetchMarketData } from './fetchMarketData';

export const createOrder = (
    orderType, price, amount, fromAccount, toAccount
) => async (
    dispatch, getState
) => {
    const state = getState();

    // get market pair and tokens from state
    const marketPair = state.ui.market.marketPairs.marketPair;
    const quoteToken = state.ui.market.marketPairs.quoteToken;
    const baseToken = state.ui.market.marketPairs.baseToken;

    // set params for api call
    const params = {
        market: marketPair,
        price: price,
        amount: amount,
        from: fromAccount,
        to: toAccount,
    };

    // fetch account information, return error if not fetched
    try {
        const infoFromAccount = await apiCall('finance/get/account', {address: fromAccount});
        const infoToAccount = await apiCall('finance/get/account', {address: toAccount});

    // check account token type and balance
        if (orderType === 'bid' && infoFromAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog('Invalid payment account (wrong token)', error));
            return error;
        } else if (orderType === 'ask' && infoFromAccount.ticker !== baseToken) {
            dispatch(showErrorDialog('Invalid payment account (wrong token)', error));
            return error;
        } else if (infoFromAccount.balance < amount) {
            dispatch(showErrorDialog('Not enough balance', error));
            return error;
        }
        if (orderType === 'bid' && infoToAccount.ticker !== baseToken) {
            dispatch(showErrorDialog('Invalid receival account (wrong token)', error));
            return error;
        } else if (orderType === 'ask' && infoToAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog('Invalid receival account (wrong token)', error));
            return error;
        }
    } catch (error) {
        dispatch(showErrorDialog('Error fetching account information:', error));
        return;
    }

    // create order through secure api call
    try {
        const result = await secureApiCall('market/create/' + orderType, params);
        if (result.success === true) {
            dispatch(showSuccessDialog(
                'Order placed successfully, txid: ', 
                result.txid, 
                'Order address: ', 
                result.address));
            return result;
        } else {
            dispatch(showErrorDialog('Error placing order (success = false):', result));
            return;
        }
    } catch (error) {
        dispatch(showErrorDialog('Error placing order:', error));
        return;
    }
};


export const executeOrder = ( 
    orderAddress, fromAccount, toAccount 
) => async (
    dispatch, getState
) => {
    const state = getState();
    const quoteToken = state.ui.market.marketPairs.quoteToken;
    const baseToken = state.ui.market.marketPairs.baseToken;

    // set params for api call
    const params = {
        address: orderAddress,
        from: fromAccount,
        to: toAccount,
    };

    try {
        const orderInfo = await apiCall('market/get/order', {address: orderAddress});
        const orderType = orderInfo.type;
        const infoFromAccount = await apiCall('finance/get/account', {address: fromAccount});
        const infoToAccount = await apiCall('finance/get/account', {address: toAccount});
    
        // check account token type and balance
        if (orderType === 'bid' && infoFromAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog('Invalid payment account (wrong token)', error));
            return error;
        } else if (orderType === 'ask' && infoFromAccount.ticker !== baseToken) {
            dispatch(showErrorDialog('Invalid payment account (wrong token)', error));
            return error;
        } else if (infoFromAccount.balance < amount) {
            dispatch(showErrorDialog('Not enough balance', error));
            return error;
        }
        if (orderType === 'bid' && infoToAccount.ticker !== baseToken) {
            dispatch(showErrorDialog('Invalid receival account (wrong token)', error));
            return error;
        } else if (orderType === 'ask' && infoToAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog('Invalid receival account (wrong token)', error));
            return error;
        }
    } catch (error) {
        dispatch(showErrorDialog('Error fetching account/order information:', error));
        return error;
    }

    // execute order through secure api call
    try {
        const result = await secureApiCall('market/execute/order', params)    
        if (result.success === true) {
            dispatch(showSuccessDialog(
                'Order executed successfully, txid: ', 
                result.txid, 
                'Order address: ', 
                result.address));
            return result;
        } else {
            dispatch(showErrorDialog('Error executing order (success = false):', result));
            return;
        }        
    } catch (error) {
        dispatch(showErrorDialog('Error executing order:', error));
        return;
    }
};


export const cancelOrder = (
    orderAddress
) => async (
    dispatch
) => {
    // set params for api call
    const params = {
        txid: orderAddress,
    };

    try {
        const result = await secureApiCall('market/cancel/order', params);
        if (result.success === true) {
            dispatch(showSuccessDialog(
                'Order cancelled successfully, txid: ', 
                result.txid, 
                'Order address: ', 
                result.address));
            dispatch(fetchMarketData());
            return result;
        } else {
            dispatch(showErrorDialog('Error cancelling order (success = false):', result));
            return;
        }
    } catch (error) {
        dispatch(showErrorDialog('Error cancelling order:', error));
        return;
    }
};