import { listMarket, DEFAULT_MARKET_PAIR } from './listMarket';
import { showErrorDialog } from 'nexus-module';

let MULTIPLIER = 1;

export const fetchLastPrice = async (
    inputMarket = DEFAULT_MARKET_PAIR, 
    orderToken,
    baseToken
) => {
    try {
      const pair = inputMarket;
      const resultBid = await listMarket(
        pair, 
        'executed',
        '/timestamp,type,order.amount,contract.amount,price',
        '',
        'time', 
        'desc', 
        'all', 
        5,
        'Bid'
      );

      const resultAsk = await listMarket(
        pair, 
        'executed',
        '/timestamp,type,order.amount,contract.amount,price',
        '',
        'time', 
        'desc', 
        'all', 
        5,
        'Ask'
      );

      if (orderToken === 'NXS') {
        MULTIPLIER = 1e6;
      } else if (baseToken === 'NXS') {
        MULTIPLIER = 1e-6;
      } else {
        MULTIPLIER = 1;
      }

      let result; 
      if (resultBid[0].timestamp > resultAsk[0].timestamp) {
        result = (resultBid[0].contract.amount * MULTIPLIER) / resultBid[0].order.amount;
        //result = resultBid[0].price;
      } else {
        result = (resultAsk[0].order.amount * MULTIPLIER) / resultAsk[0].contract.amount;
        //result = resultAsk[0].price;
      }

      //setLastPrice(result);
      return result;
    
    } catch (error) {
      showErrorDialog({
        message: 'Cannot get last price',
        note: error?.message || 'Unknown error',
      });
      return null;
    }
};