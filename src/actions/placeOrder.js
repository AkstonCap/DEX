import { apiCall, 
    showErrorDialog, 
    showSuccessDialog,
    secureApiCall
} from 'nexus-module';
import { addUnconfirmedOrder, removeUnconfirmedOrder, addCancellingOrder, addUnconfirmedTrade } from './actionCreators';
// import fetchMarketData separately in components to avoid nested dispatch issues

// create order
export const createOrder = (
    orderType, price, quoteAmount, fromAccount, toAccount
) => async (
    dispatch, getState
) => {

    // Validate parameters
    if (!orderType || !price || !quoteAmount || !fromAccount || !toAccount || 
        fromAccount === '' || toAccount === '') {
        showErrorDialog({
            message: 'Missing required parameters',
            note: 'Please fill in all required fields'
        });
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
            showErrorDialog({
                message: 'Invalid payment account (wrong token)',
                note: `Expected ${quoteToken} account for bid order`
            });
            return null;
        } else if (orderType === 'ask' && infoFromAccount.ticker !== baseToken) {
            showErrorDialog({
                message: 'Invalid payment account (wrong token)',
                note: `Expected ${baseToken} account for ask order`
            });
            return null;
        } else if (
            (orderType === 'bid' && infoFromAccount.balance < quoteAmount) || 
            (orderType === 'ask' && infoFromAccount.balance < baseAmount)
        ) {
            showErrorDialog({
                message: 'Not enough balance',
                note: 'Account balance is insufficient for this order'
            });
            return null;
        }
        if (orderType === 'bid' && infoToAccount.ticker !== baseToken) {
            showErrorDialog({
                message: 'Invalid receival account (wrong token)',
                note: `Expected ${baseToken} account to receive tokens`
            });
            return null;
        } else if (orderType === 'ask' && infoToAccount.ticker !== quoteToken) {
            showErrorDialog({
                message: 'Invalid receival account (wrong token)',
                note: `Expected ${quoteToken} account to receive tokens`
            });
            return null;
        }
    } catch (error) {
        showErrorDialog({
            message: 'Error fetching account information',
            note: error?.message || 'Unknown error occurred'
        });
        return null;
    }

    // create order through secure api call
    try {
        const result = await secureApiCall('market/create/' + orderType, params);
        
        // Handle case where user cancels the secure API call
        if (!result) {
            // User cancelled, don't show error - just return null silently
            return null;
        }
        
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
                // For bid: buying BASE with QUOTE
                // contract = what you're SENDING (quote token)
                // order = what you want to RECEIVE (base token)
                unconfirmedOrder.contract = {
                    amount: parseFloat(quoteAmount),
                    ticker: quoteToken
                };
                unconfirmedOrder.order = {
                    amount: parseFloat(baseAmount),
                    ticker: baseToken
                };
            } else { // ask
                // For ask: selling BASE for QUOTE
                // contract = what you're SENDING (base token)
                // order = what you want to RECEIVE (quote token)
                unconfirmedOrder.contract = {
                    amount: parseFloat(baseAmount),
                    ticker: baseToken
                };
                unconfirmedOrder.order = {
                    amount: parseFloat(quoteAmount),
                    ticker: quoteToken
                };
            }
            
            dispatch(addUnconfirmedOrder(unconfirmedOrder));
            
            // Ensure we only pass serializable strings to the dialog
            const transactionId = String(result.txid || '');
            const orderAddress = String(result.address || '');
            
            showSuccessDialog({
                message: 'Order placed successfully',
                note: 'Transaction ID: ' + transactionId + '\nOrder address: ' + orderAddress
            });
            // Note: fetchMarketData will be called separately to avoid nested dispatch issues
            return result;
        } else {
            showErrorDialog({
                message: 'Error placing order (success = false)',
                note: result?.message || 'Unknown error'
            });
            return null;
        }

    } catch (error) {
        showErrorDialog({
            message: 'Error placing order',
            note: error?.message || 'Unknown error occurred'
        });
        return null;
    }
};


export const executeOrder = ( 
    txid, fromAccount, toAccount, quoteAmount, baseAmount 
) => async (
    dispatch, getState
) => {

    if (!txid || !fromAccount || !toAccount || 
        txid === '' || fromAccount === '' || toAccount === '') {
        showErrorDialog({
            message: 'Missing required parameters',
            note: 'Please fill in all required fields'
        });
        return null;
    }

    const state = getState();
    const quoteToken = state.ui.market.marketPairs.quoteToken;
    const baseToken = state.ui.market.marketPairs.baseToken;
    const marketPair = state.ui.market.marketPairs.marketPair;

    // Declare these outside try-catch so they're available in both blocks
    let orderType = null;
    let orderInfo = null;
    let amount = null;

    // set params for api call
    const params = {
        txid: txid,
        from: fromAccount,
        to: toAccount,
    };

    try {
        // Get all orders for the market and find the one with matching txid
        const orderListResponse = await apiCall(
            'market/list/order/txid,owner,price,type,contract.amount,contract.ticker,order.amount,order.ticker', 
            {
                market: marketPair,
                limit: 1000
            }
        ).catch((error) => {
            showErrorDialog({
                message: 'Error fetching order information',
                note: error?.message || 'Unknown error occurred'
            });
            return null;
        });

        if (!orderListResponse) {
            return null;
        }

        // Search through bids and asks for the order with matching txid
        orderInfo = null;
        if (orderListResponse.bids) {
            orderInfo = orderListResponse.bids.find(order => order.txid === txid);
        }
        if (!orderInfo && orderListResponse.asks) {
            orderInfo = orderListResponse.asks.find(order => order.txid === txid);
        }

        if (!orderInfo) {
            showErrorDialog({
                message: 'Order not found',
                note: `No order found with transaction ID: ${txid}`
            });
            return null;
        }

        orderType = orderInfo.type;

        // Set the amount you actually pay when executing the order
        // When executing a bid: you pay base token (what the bidder wants to buy)
        // When executing an ask: you pay quote token (what the asker wants to receive)
        if (orderType === 'bid') {
            amount = baseAmount;  // Executing bid: pay base
        } else if (orderType === 'ask') {
            amount = quoteAmount; // Executing ask: pay quote
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
        if (orderType === 'bid' && infoFromAccount.ticker !== baseToken) {
            showErrorDialog({
                message: 'Invalid payment account (wrong token)',
                note: `Expected ${baseToken} account for bid execution`
            });
            return null;
        } else if (orderType === 'ask' && infoFromAccount.ticker !== quoteToken) {
            showErrorDialog({
                message: 'Invalid payment account (wrong token)',
                note: `Expected ${quoteToken} account for ask execution`
            });
            return null;
        } else if (infoFromAccount.balance < amount) {
            showErrorDialog({
                message: 'Not enough balance',
                note: 'Account balance is insufficient for this execution'
            });
            return null;
        }
        if (orderType === 'bid' && infoToAccount.ticker !== quoteToken) {
            showErrorDialog({
                message: 'Invalid receival account (wrong token)',
                note: `Expected ${quoteToken} account to receive tokens`
            });
            return null;
        } else if (orderType === 'ask' && infoToAccount.ticker !== baseToken) {
            showErrorDialog({
                message: 'Invalid receival account (wrong token)',
                note: `Expected ${baseToken} account to receive tokens`
            });
            return null;
        }
    } catch (error) {
        showErrorDialog({
            message: 'Error fetching account/order information',
            note: error?.message || 'Unknown error occurred'
        });
        return null;
    }

    // execute order through secure api call
    try {
        const result = await secureApiCall(
            'market/execute/order', 
            params
        );

        if (!result) {
            showErrorDialog({
                message: 'Error executing order',
                note: 'No response received from chain'
            });
            return null;
        }

        if (result.success) {
            // Add to unconfirmed trades immediately with proper structure to match confirmed trades
            const unconfirmedTrade = {
                txid: result.txid,
                type: orderType,
                price: parseFloat(orderInfo.price || 0),
                timestamp: Date.now() / 1000,
                contract: {
                    amount: orderType === 'bid' ? parseFloat(baseAmount || 0) : parseFloat(baseAmount || 0),
                    ticker: baseToken
                },
                order: {
                    amount: orderType === 'bid' ? parseFloat(quoteAmount || 0) : parseFloat(quoteAmount || 0),
                    ticker: quoteToken
                }
            };
            
            dispatch(addUnconfirmedTrade(unconfirmedTrade));
            
            // Ensure we only pass serializable strings to the dialog
            const transactionId = String(result.txid || '');
            const orderAddress = String(result.address || '');
            
            showSuccessDialog({
                message: 'Order executed successfully',
                note: 'Transaction ID: ' + transactionId + '\nOrder address: ' + orderAddress
            });
            // Note: fetchMarketData will be called separately to avoid nested dispatch issues
            return result;
        } else {
            showErrorDialog({
                message: 'Error executing order (success = false)',
                note: result?.message || 'Unknown error'
            });
            return null;
        }        
    } catch (error) {
        showErrorDialog({
            message: 'Error executing order',
            note: error?.message || 'Unknown error occurred'
        });
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
            showErrorDialog({
                message: 'Error cancelling order',
                note: 'No response received from chain'
            });
            return null;
        }
        
        if (result.success) {
            // Mark the order as being cancelled
            dispatch(addCancellingOrder(txid, result.txid));

            // Ensure we only pass serializable strings to the dialog
            const cancellationId = String(result.txid || '');
            const orderTxid = String(txid || '');
            
            showSuccessDialog({
                message: 'Order cancellation submitted',
                note: 'Cancellation ID: ' + cancellationId + '\nOrder ' + orderTxid + ' is being cancelled'
            });
            // Note: fetchMarketData will be called separately to avoid nested dispatch issues
            return result;
        } else {
            showErrorDialog({
                message: 'Error cancelling order (success = false)',
                note: result?.message || 'Unknown error'
            });
            return null;
        }
    } catch (error) {
        showErrorDialog({
            message: 'Error cancelling order',
            note: error?.message || 'Unknown error occurred'
        });
        return null;
    }
};