

export const fetchAccounts = () => async (dispatch, getState) => {

    const state = getState();
    const quoteToken = state.ui.market.marketPairs.quoteToken;
    const baseToken = state.ui.market.marketPairs.baseToken;
    const orderInQuestion = state.ui.market.orderInQuestion;
    const orderMethod = state.ui.market.orderInQuestion.orderMethod;
    const amount = state.ui.market.orderInQuestion.amount;
    
    try {
        
        const result = await apiCall('finance/list/account');

        let quoteAccounts = [];
        let baseAccounts = [];

        if (orderMethod === 'bid' || (orderMethod === 'execute' && orderInQuestion.type === 'bid')) {

          const quoteAccounts = result.filter((acct) => acct.ticker === quoteToken && acct.balance > amount);
          const baseAccounts = result.filter((acct) => acct.ticker === baseToken);
          setAccounts({ quoteAccounts, baseAccounts });

        } else if (orderMethod === 'ask' || (orderMethod === 'execute' && orderInQuestion.type === 'ask')) {

          const quoteAccounts = result.filter((acct) => acct.ticker === quoteToken);
          const baseAccounts = result.filter((acct) => acct.ticker === baseToken && acct.balance > amount);
          setAccounts({ quoteAccounts, baseAccounts });

        } else {

          setAccounts({ quoteAccounts, baseAccounts });

        }

    } catch (error) {

        dispatch(showErrorDialog('Error fetching account information:', error));

    }
}