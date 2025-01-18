import { apiCall, 
    showErrorDialog, 
    showSuccessDialog,
    secureApiCall
} from 'nexus-module';
import { fetchMarketData } from './fetchMarketData';

export const createOrder = (
    orderType, price, quoteAmount, fromAccount, toAccount
) => async (
    dispatch, getState
) => {
    if (!orderType || !price || !quoteAmount || !fromAccount || !toAccount) {
        dispatch(showErrorDialog('Missing required parameters'));
        return null;
    }
    
    const state = getState();

    // get market pair and tokens from state
    const marketPair = state.ui.market.marketPairs.marketPair;
    const quoteToken = state.ui.market.marketPairs.quoteToken;
    const baseToken = state.ui.market.marketPairs.baseToken;
    const baseAmount = quoteAmount / price;

    let params;
    // set params for api call
    if (orderType === 'bid') {
        params = {
            market: marketPair,
            price: price,
            amount: quoteAmount,
            from: fromAccount,
            to: toAccount,
        };
    } else if (orderType === 'ask') {
        params = {
            market: marketPair,
            price: price,
            amount: baseAmount,
            from: fromAccount,
            to: toAccount,
        };
    }

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
        } else if (
            (orderType === 'bid' && infoFromAccount.balance < quoteAmount) || 
            (orderType === 'ask' && infoFromAccount.balance < baseAmount)
        ) {
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
        dispatch(fetchMarketData());
        
        if (result.success) {
            dispatch(showSuccessDialog(
                'Order placed successfully',
                `Transaction ID: ${result.txid}`,
                `Order address: ${result.address}`
            ));
            dispatch(fetchMarketData());
            return result;
        } else {
            dispatch(showErrorDialog('Error placing order (success = false):', result));
            return null;
        }

    } catch (error) {
        dispatch(showErrorDialog('Error placing order:', error));
        return;
    }
};


export const executeOrder = ( 
    txid, fromAccount, toAccount, quoteAmount, baseAmount 
) => async (
    dispatch, getState
) => {

    if (!txid || !fromAccount || !toAccount) {
        dispatch(showErrorDialog('Missing required parameters'));
        return null;
    }

    const state = getState();
    const quoteToken = state.ui.market.marketPairs.quoteToken;
    const baseToken = state.ui.market.marketPairs.baseToken;
    const marketPair = state.ui.market.marketPairs.marketPair;

    // set params for api call
    const params = {
        txid: txid,
        from: fromAccount,
        to: toAccount,
    };

    try {
        const orderInfo = await apiCall(
            'market/list/order', 
            {
                market: marketPair,
                where: 'results.txid=' + txid,
            }
        ).catch((error) => {
            dispatch(showErrorDialog('Error fetching order information:', error));
            return error;
        });

        const orderType = orderInfo.type;
        let amount;

        if (orderType === 'bid') {
            amount = quoteAmount;
        } else if (orderType === 'ask') {
            amount = baseAmount;
        }

        const infoFromAccount = await apiCall(
            'finance/get/account', 
            {address: fromAccount}
        ).catch((error) => {
            dispatch(showErrorDialog('Error fetching payment account information:', error));
            return error;
        });

        const infoToAccount = await apiCall(
            'finance/get/account', 
            {address: toAccount}
        ).catch((error) => {
            dispatch(showErrorDialog('Error fetching receival account information:', error));
            return error;
        });
    
        // check account token type and balance
        if (orderType === 'bid' && infoFromAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog('Invalid payment account (wrong token)'));
            return;
        } else if (orderType === 'ask' && infoFromAccount.ticker !== baseToken) {
            dispatch(showErrorDialog('Invalid payment account (wrong token)'));
            return;
        } else if (infoFromAccount.balance < amount) {
            dispatch(showErrorDialog('Not enough balance'));
            return;
        }
        if (orderType === 'bid' && infoToAccount.ticker !== baseToken) {
            dispatch(showErrorDialog('Invalid receival account (wrong token)'));
            return;
        } else if (orderType === 'ask' && infoToAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog('Invalid receival account (wrong token)'));
            return;
        }
    } catch (error) {
        dispatch(showErrorDialog('Error fetching account/order information:', error));
        return error;
    }

    // execute order through secure api call
    try {
        const result = await secureApiCall(
            'market/execute/order', 
            params
        ).catch((error) => {
            dispatch(showErrorDialog('Error executing order:', error));
            return error;
        });

        if (result.success) {
            dispatch(showSuccessDialog(
                'Order executed successfully',
                `Transaction ID: ${result.txid}`,
                `Order address: ${result.address}`));
            dispatch(fetchMarketData());
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
    txid
) => async (
    dispatch
) => {
    // set params for api call
    const params = {
        txid: txid,
    };

    try {
        const result = await secureApiCall(
            'market/cancel/order', 
            params
        ).catch((error) => {
            dispatch(showErrorDialog('Error cancelling order:', error));
            return error;
            }
        );
        
        if (result.success) {
            dispatch(showSuccessDialog(
                'Order cancelled successfully',
                `Transaction ID: ${result.txid}`,
                `Order address: ${result.address}`));
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