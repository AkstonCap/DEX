import { listMarket } from './listMarket';
import { 
  setExecutedOrders,
  setMyTrades,
} from './actionCreators';
import { 
  showErrorDialog, 
  apiCall 
} from 'nexus-module';
import { DEFAULT_MARKET_PAIR } from 'App/Main';

export const fetchExecuted = (
  inputMarket = DEFAULT_MARKET_PAIR, 
  timeFilter = '1y'
) => async (
  dispatch
) => {
  try {
    const pair = inputMarket;
    const baseToken = pair.split('/')[0];
      
/*
    const data = await listMarket(
      pair, 
      'executed',
      '/timestamp,price,type,contract.amount,contract.ticker,order.amount,order.ticker',
      '', 
      'time', 
      'desc', 
      timeFilter,
      //'all', 
      0,
      null
    );
    //dispatch(showSuccessDialog('Executed transactions fetched successfully: ', data.bids?.length, data.asks?.length));
*/
     
    const data1 = await apiCall(
      'market/list/executed/timestamp,price,type,contract.amount,contract.ticker,order.amount,order.ticker', 
      //'market/list/executed',
      {
        market: pair,
        sort: 'timestamp', 
        order: 'desc', 
        limit: 100
      }
    ).catch((error) => {
      dispatch(showErrorDialog({
        message: 'Cannot get executed transactions from apiCall (fetchExecuted)',
        note: error?.message || 'Unknown error',
      }));
      return {bids: [], asks: []};
    });

    if (!data1.bids || data1.bids?.length === 0) {
      data1.bids = [];
      dispatch(showErrorDialog('No bids found in executed orders'));
    } else {
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

    if (!data1.asks || data1.asks?.length === 0) {
      data1.asks = [];
      dispatch(showErrorDialog('No asks found in executed orders'));
    } else {
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

/*
    if (!data.bids) {
      data.bids = [];
    }
    if (!data.asks) {
      data.asks = [];
    }
*/
    dispatch(setExecutedOrders(data1));

    const myTrades = await apiCall(
      'market/user/executed', 
      {
        token: baseToken,
        sort: 'price', 
        order: 'desc', 
        limit: 10
      }
    );

    if (!myTrades.bids) {
      myTrades.bids = [];
    }
    if (!myTrades.asks) {
      myTrades.asks = [];
    }

    dispatch(setMyTrades(myTrades));

  } catch (error) {
    dispatch(showErrorDialog({
      message: 'Cannot get executed transactions (fetchExecuted)',
      note: error?.message || 'Unknown error',
    }));

    dispatch(setExecutedOrders({ bids: [], asks: [] }));
    dispatch(setMyTrades({ bids: [], asks: [] }));
  }
};