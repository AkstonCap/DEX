import { 
  setExecutedOrders,
  setMyTrades,
  removeUnconfirmedTrade,
} from './actionCreators';
import { 
  showErrorDialog, 
  apiCall 
} from 'nexus-module';

export const fetchExecuted = (
) => async (
  dispatch,
  getState
) => {
  try {
    //const pair = inputMarket;
    //const baseToken = pair.split('/')[0];
    const state = getState();
    const marketPair = state.ui.market.marketPairs.marketPair;
    const baseToken = state.ui.market.marketPairs.baseToken;
    const quoteToken = state.ui.market.marketPairs.quoteToken;
    const timeSpan = state.settings.timeSpan;
    //const timestampMin = Date.now()/1000 - 60*60*24*365; // 1 year
    let queryString = 'results.timestamp>since(`1 year`);';
    if (timeSpan === '1y') {
      queryString = 'results.timestamp>since(`1 year`);';
    } else if (timeSpan === '1m') {
      queryString = 'results.timestamp>since(`1 month`);';
    } else if (timeSpan === '1w') {
      queryString = 'results.timestamp>since(`1 week`);';
    } else if (timeSpan === '1d') {
      queryString = 'results.timestamp>since(`1 day`);';
    } else {
      queryString = '';
    }
     
    const data1 = await apiCall( 
      'market/list/executed/timestamp,price,type,contract.amount,contract.ticker,order.amount,order.ticker', 
      {
        market: marketPair,
        sort: 'timestamp', 
        order: 'desc', 
        limit: 100,
        where: queryString,
      }
    ).catch((error) => {
      dispatch(showErrorDialog({
        message: 'Cannot get executed transactions from apiCall (fetchExecuted)',
        note: error?.message || 'Unknown error',
      }));
      const data={bids: [], asks: []};
      dispatch(setExecutedOrders(data));
      return data; // Return default data
    });

    if ( data1.bids?.length !== 0) {
      data1.bids.forEach((element) => {
        if (element.contract.ticker === 'NXS') {
          element.contract.amount = element.contract.amount / 1e6;
        } else if (element.order.ticker === 'NXS') {
          element.order.amount = element.order.amount / 1e6;
        }
      });
      data1.bids.forEach((element) => {
        if (element.price !== (element.contract.amount / element.order.amount)) {
          element.price = (element.contract.amount / element.order.amount);
        }
      });
    }

    if ( data1.asks?.length !== 0) {
      data1.asks.forEach((element) => {
        if (element.contract.ticker === 'NXS') {
          element.contract.amount = element.contract.amount / 1e6;
        } else if (element.order.ticker === 'NXS') {
          element.order.amount = element.order.amount / 1e6;
        }
      });
      data1.asks.forEach((element) => {
        if (element.price !== (element.order.amount / element.contract.amount)) {
          element.price = (element.order.amount / element.contract.amount);
        }
      });
    }

    dispatch(setExecutedOrders(data1));

    let myTrades = {executed: []};
    
    if (baseToken !== 'NXS') {

      myTrades = await apiCall(
        'market/user/executed', 
        {
          token: baseToken,
          sort: 'timestamp', 
          order: 'desc', 
          limit: 20
        }

      ).catch((error) => {

        dispatch(showErrorDialog({
          message: 'Cannot get my trades from apiCall (fetchExecuted)',
          note: error?.message || 'Unknown error',
        }));
        const defaultTrades = {executed: []};
        dispatch(setMyTrades(defaultTrades));
        return defaultTrades; // Return default data

      });
    }

    // Add length check

    const myTrades1 = {
      executed: myTrades.executed?.filter((element) => 
        (
          element.contract.ticker === baseToken && 
          element.type === 'bid' && 
          element.order.ticker === quoteToken
        ) || (
          element.order.ticker === baseToken &&
          element.type === 'ask' &&
          element.contract.ticker === quoteToken
        )
      )
    };

    if ( myTrades1.executed?.length !== 0) {
      myTrades1.executed.forEach((element) => {

        if (element.contract.ticker === 'NXS') {
          element.contract.amount = element.contract.amount / 1e6;
        } else if (element.order.ticker === 'NXS') {
          element.order.amount = element.order.amount / 1e6;
        }

      });
      myTrades1.executed.forEach((element) => {
        if (element.price !== (element.contract.amount / element.order.amount) && element.type === 'ask') {
          element.price = (element.contract.amount / element.order.amount);
        } else if (element.price !== (element.order.amount / element.contract.amount) && element.type === 'bid') {
          element.price = (element.order.amount / element.contract.amount);
        }

        if (element.market === quoteToken + '/' + baseToken) {
          element.type = element.type === 'bid' ? 'ask' : 'bid';
          element.market = marketPair;
        }

      });
    }

    dispatch(setMyTrades(myTrades1));
    
    // Remove any unconfirmed trades that now appear in confirmed trade history
    const currentState = getState();
    const unconfirmedTrades = currentState.ui.market.myUnconfirmedTrades?.unconfirmedTrades || [];
    
    unconfirmedTrades.forEach(unconfirmedTrade => {
      const isConfirmed = myTrades1.executed.find(trade => 
        trade.txid === unconfirmedTrade.txid ||
        (trade.timestamp === unconfirmedTrade.timestamp && 
         trade.amount === unconfirmedTrade.amount &&
         trade.total === unconfirmedTrade.total)
      );
      if (isConfirmed) {
        dispatch(removeUnconfirmedTrade(unconfirmedTrade.txid || `${unconfirmedTrade.timestamp}-${unconfirmedTrade.amount}`));
      }
    });
    
    return true; // Return success indicator

  } catch (error) {
    dispatch(showErrorDialog({
      message: 'Cannot get executed transactions (fetchExecuted)',
      note: error?.message || 'Unknown error',
    }));

    dispatch(setExecutedOrders({ bids: [], asks: [] }));
    dispatch(setMyTrades({ executed: [] }));
    return null; // Return null for error
  }
};