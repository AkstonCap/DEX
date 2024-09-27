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
      const result = await listMarket(
        pair, 
        'executed', 
        'time', 
        'desc', 
        'all', 
        5,
        null
      );
      
      const lastPrice = (result[0].order.amount * MULTIPLIER) / result[0].contract.amount;
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