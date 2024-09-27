import * as TYPE from './types';
import { apiCall } from 'nexus-module';
import { listMarket, DEFAULT_MARKET_PAIR } from './listMarket';

const MULTIPLIER = 1e6;

export const fetchLastPrice = async (
    inputMarket = DEFAULT_MARKET_PAIR, 
    checkingMarket, 
    setCheckingMarket, 
    setLastPrice, 
    showErrorDialog
) => {
    if (checkingMarket) return;
    try {
      setCheckingMarket(true);
      const pair = inputMarket;
      const resultBid = await listMarket(
        pair, 
        'executed',
        'timestamp,type,order.amount,contract.amount',
        'time', 
        'desc', 
        'all', 
        5,
        'Bid'
      );

      const resultAsk = await listMarket(
        pair, 
        'executed',
        'timestamp,type,order.amount,contract.amount',
        'time', 
        'desc', 
        'all', 
        5,
        'Ask'
      );

      resultTotal = [...resultBid, ...resultAsk];
      
      const lastPriceBid = (resultBid[0].contract.amount * MULTIPLIER) / result[0].order.amount;
      const lastPriceAsk = resultAsk[0].order.amount / (resultAsk[0].contract.amount * MULTIPLIER);
      const lastPrice = max()

      
      setLastPrice(lastPrice);
    
    } catch (error) {
      showErrorDialog({
        message: 'Cannot get last price',
        note: error?.message || 'Unknown error',
      });
    } finally {
      setCheckingMarket(false);
    }
};