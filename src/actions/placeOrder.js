import { apiCall, 
    showErrorDialog, 
    showSuccessDialog,
    secureApiCall
} from 'nexus-module';
import { addUnconfirmedOrder, removeUnconfirmedOrder, addCancellingOrder } from './actionCreators';
// import fetchMarketData separately in components to avoid nested dispatch issues

// create order
export const createOrder = (
    orderType, price, quoteAmount, fromAccount, toAccount
) => async (
    dispatch, getState
) => {

    // Validate parameters
    if (!orderType || !price || !quoteAmount || !fromAccount || !toAccount) {
        dispatch(showErrorDialog({
            message: 'Missing required parameters',
            note: 'Please fill in all required fields'
        }));
        return null;
    }
    
    const state = getState();

    // get market pair and tokens from state
    const marketPair = state.ui.market.marketPairs.marketPair;
    const quoteToken = state.ui.market.marketPairs.quoteToken;
    const baseToken = state.ui.market.marketPairs.baseToken;
    const quoteTokenDecimals = state.ui.market.marketPairs.quoteTokenDecimals || 6;
    const baseTokenDecimals = state.ui.market.marketPairs.baseTokenDecimals || 6;
    // calculate baseAmount and round if it has more decimals than allowed
    const rawBaseAmount = quoteAmount / price;
    const baseDecimalsCount = (rawBaseAmount.toString().split('.')[1] || '').length;
    const baseAmount = baseDecimalsCount > baseTokenDecimals
        ? parseFloat(rawBaseAmount.toFixed(baseTokenDecimals))
        : rawBaseAmount;
    

    let params;
    // set params for api call
    if (orderType === 'bid') {
        params = {
            market: marketPair,
            //price: parseFloat(price.toFixed(quoteTokenDecimals)),
            //amount: parseFloat(quoteAmount.toFixed(quoteTokenDecimals)),
            price: price,
            amount: quoteAmount,
            from: fromAccount,
            to: toAccount,
        };
    } else if (orderType === 'ask') {
        params = {
            market: marketPair,
            //price: parseFloat(price.toFixed(quoteTokenDecimals)),
            //amount: parseFloat(baseAmount.toFixed(baseTokenDecimals)),
            price: price,
            amount: baseAmount,
            from: fromAccount,
            to: toAccount,
        };
    }

    // fetch account information, return error if not fetched
    try {

        const infoFromAccountTest = await apiCall(
            'finance/get/account', 
            {address: fromAccount}
        ).catch((error) => {
            return [];
        });

        const infoFromTokenTest = await apiCall(
            'register/get/finance:token', 
            {address: fromAccount}
        ).catch((error) => {
            return [];
        });

        let infoFromAccount = [];
        if ( infoFromAccountTest?.address === fromAccount ) {
            infoFromAccount = infoFromAccountTest;
        } else if ( infoFromTokenTest?.address === fromAccount ) {
            infoFromAccount = infoFromTokenTest;
        }

        const infoToAccountTest = await apiCall(
            'finance/get/account', 
            {address: toAccount}
        ).catch((error) => {
            return [];
        });

        const infoToTokenTest = await apiCall(
            'register/get/finance:token', 
            {address: toAccount}
        ).catch((error) => {
            return [];
        });

        let infoToAccount = [];
        if ( infoToAccountTest?.address === toAccount ) {
            infoToAccount = infoToAccountTest;
        } else if ( infoToTokenTest?.address === toAccount ) {
            infoToAccount = infoToTokenTest;
        }

    // check account token type and balance
        if (orderType === 'bid' && infoFromAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog({
                message: 'Invalid payment account (wrong token)',
                note: `Expected ${quoteToken} account for bid order`
            }));
            return null;
        } else if (orderType === 'ask' && infoFromAccount.ticker !== baseToken) {
            dispatch(showErrorDialog({
                message: 'Invalid payment account (wrong token)',
                note: `Expected ${baseToken} account for ask order`
            }));
            return null;
        } else if (
            (orderType === 'bid' && infoFromAccount.balance < quoteAmount) || 
            (orderType === 'ask' && infoFromAccount.balance < baseAmount)
        ) {
            dispatch(showErrorDialog({
                message: 'Not enough balance',
                note: 'Account balance is insufficient for this order'
            }));
            return null;
        }
        if (orderType === 'bid' && infoToAccount.ticker !== baseToken) {
            dispatch(showErrorDialog({
                message: 'Invalid receival account (wrong token)',
                note: `Expected ${baseToken} account to receive tokens`
            }));
            return null;
        } else if (orderType === 'ask' && infoToAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog({
                message: 'Invalid receival account (wrong token)',
                note: `Expected ${quoteToken} account to receive tokens`
            }));
            return null;
        }
    } catch (error) {
        dispatch(showErrorDialog({
            message: 'Error fetching account information',
            note: error?.message || 'Unknown error occurred'
        }));
        return null;
    }

    // create order through secure api call
    try {
        const result = await secureApiCall('market/create/' + orderType, params);
        
        if (result.success) {
            // Add to unconfirmed orders immediately with proper structure to match confirmed orders
            const unconfirmedOrder = {
                txid: result.txid,
                address: result.address,
                type: orderType,
                price: parseFloat(price),
                timestamp: Date.now() / 1000
            };
            
            if (orderType === 'bid') {
                // For bid: contract = what you're buying (base), order = what you're paying (quote)
                unconfirmedOrder.contract = {
                    amount: parseFloat(baseAmount),
                    ticker: baseToken
                };
                unconfirmedOrder.order = {
                    amount: parseFloat(quoteAmount),
                    ticker: quoteToken
                };
            } else { // ask
                // For ask: contract = what you're selling (base), order = what you want (quote)
                unconfirmedOrder.contract = {
                    amount: parseFloat(baseAmount),
                    ticker: baseToken
                };
                unconfirmedOrder.order = {
                    amount: parseFloat(quoteAmount),
                    ticker: quoteToken
                };
            }
            
            console.log('Dispatching addUnconfirmedOrder with:', unconfirmedOrder);
            dispatch(addUnconfirmedOrder(unconfirmedOrder));
            
            dispatch(showSuccessDialog({
                message: 'Order placed successfully',
                note: `Transaction ID: ${result.txid}\nOrder address: ${result.address}`
            }));
            // Note: fetchMarketData will be called separately to avoid nested dispatch issues
            return result;
        } else {
            dispatch(showErrorDialog({
                message: 'Error placing order (success = false)',
                note: result?.message || 'Unknown error'
            }));
            return null;
        }

    } catch (error) {
        dispatch(showErrorDialog({
            message: 'Error placing order',
            note: error?.message || 'Unknown error occurred'
        }));
        return null;
    }
};


export const executeOrder = ( 
    txid, fromAccount, toAccount, quoteAmount, baseAmount 
) => async (
    dispatch, getState
) => {

    if (!txid || !fromAccount || !toAccount) {
        dispatch(showErrorDialog({
            message: 'Missing required parameters',
            note: 'Please fill in all required fields'
        }));
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
            dispatch(showErrorDialog({
                message: 'Error fetching order information',
                note: error?.message || 'Unknown error occurred'
            }));
            return null;
        });

        if (!orderInfo) {
            return null;
        }

        const orderType = orderInfo.type;
        let amount;

        if (orderType === 'bid') {
            amount = quoteAmount;
        } else if (orderType === 'ask') {
            amount = baseAmount;
        }

        const infoFromAccountTest = await apiCall(
            'finance/get/account', 
            {address: fromAccount}
        ).catch((error) => {
            return [];
        });

        const infoFromTokenTest = await apiCall(
            'register/get/finance:token', 
            {address: fromAccount}
        ).catch((error) => {
            return [];
        });

        let infoFromAccount;
        if ( infoFromAccountTest?.address === fromAccount ) {
            infoFromAccount = infoFromAccountTest;
        } else if ( infoFromTokenTest?.address === fromAccount ) {
            infoFromAccount = infoFromTokenTest;
        }

        const infoToAccountTest = await apiCall(
            'finance/get/account', 
            {address: toAccount}
        ).catch((error) => {
            return [];
        });

        const infoToTokenTest = await apiCall(
            'register/get/finance:token', 
            {address: toAccount}
        ).catch((error) => {
            return [];
        });

        let infoToAccount;
        if ( infoToAccountTest?.address === toAccount ) {
            infoToAccount = infoToAccountTest;
        } else if ( infoToTokenTest?.address === toAccount ) {
            infoToAccount = infoToTokenTest;
        }

    
        // check account token type and balance
        if (orderType === 'bid' && infoFromAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog({
                message: 'Invalid payment account (wrong token)',
                note: `Expected ${quoteToken} account for bid execution`
            }));
            return null;
        } else if (orderType === 'ask' && infoFromAccount.ticker !== baseToken) {
            dispatch(showErrorDialog({
                message: 'Invalid payment account (wrong token)',
                note: `Expected ${baseToken} account for ask execution`
            }));
            return null;
        } else if (infoFromAccount.balance < amount) {
            dispatch(showErrorDialog({
                message: 'Not enough balance',
                note: 'Account balance is insufficient for this execution'
            }));
            return null;
        }
        if (orderType === 'bid' && infoToAccount.ticker !== baseToken) {
            dispatch(showErrorDialog({
                message: 'Invalid receival account (wrong token)',
                note: `Expected ${baseToken} account to receive tokens`
            }));
            return null;
        } else if (orderType === 'ask' && infoToAccount.ticker !== quoteToken) {
            dispatch(showErrorDialog({
                message: 'Invalid receival account (wrong token)',
                note: `Expected ${quoteToken} account to receive tokens`
            }));
            return null;
        }
    } catch (error) {
        dispatch(showErrorDialog({
            message: 'Error fetching account/order information',
            note: error?.message || 'Unknown error occurred'
        }));
        return null;
    }

    // execute order through secure api call
    try {
        const result = await secureApiCall(
            'market/execute/order', 
            params
        );

        if (!result) {
            dispatch(showErrorDialog({
                message: 'Error executing order',
                note: 'No response received from chain'
            }));
            return null;
        }

        if (result.success) {
            dispatch(showSuccessDialog({
                message: 'Order executed successfully',
                note: `Transaction ID: ${result.txid}\nOrder address: ${result.address}`
            }));
            // Note: fetchMarketData will be called separately to avoid nested dispatch issues
            return result;
        } else {
            dispatch(showErrorDialog({
                message: 'Error executing order (success = false)',
                note: result?.message || 'Unknown error'
            }));
            return null;
        }        
    } catch (error) {
        dispatch(showErrorDialog({
            message: 'Error executing order',
            note: error?.message || 'Unknown error occurred'
        }));
        return null;
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
        );
        
        if (!result) {
            dispatch(showErrorDialog({
                message: 'Error cancelling order',
                note: 'No response received from chain'
            }));
            return null;
        }
        
        if (result.success) {
            // Mark the order as being cancelled
            console.log('Dispatching addCancellingOrder with txid:', txid, 'cancellationTxid:', result.txid);
            dispatch(addCancellingOrder(txid, result.txid));
            
            dispatch(showSuccessDialog({
                message: 'Order cancellation submitted',
                note: `Cancellation ID: ${result.txid}\nOrder ${txid} is being cancelled`
            }));
            // Note: fetchMarketData will be called separately to avoid nested dispatch issues
            return result;
        } else {
            dispatch(showErrorDialog({
                message: 'Error cancelling order (success = false)',
                note: result?.message || 'Unknown error'
            }));
            return null;
        }
    } catch (error) {
        dispatch(showErrorDialog({
            message: 'Error cancelling order',
            note: error?.message || 'Unknown error occurred'
        }));
        return null;
    }
};