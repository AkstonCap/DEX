import { listMarket, DEFAULT_MARKET_PAIR } from './listMarket';

let MULTIPLIER = 1;

export const fetchHighestBid = async (
  pair = DEFAULT_MARKET_PAIR, 
  checkingMarket, 
  setCheckingMarket, 
  setHighestBid, 
  showErrorDialog,
  orderToken,
  baseToken
) => {
    if (checkingMarket) return;
    try {
      setCheckingMarket(true);

      const result = await listMarket(
        pair, 
        'bid',
        '', 
        '',
        'price', 
        'desc', 
        'all', 
        5,
        'bid'
      );
      
      if (orderToken === 'NXS') {
        MULTIPLIER = 1e6;
      } else if (baseToken === 'NXS') {
        MULTIPLIER = 1e-6;
      } else {
        MULTIPLIER = 1;
      }

      const topBid = (result[0]?.contract.amount * MULTIPLIER) / result[0]?.order.amount;
      setHighestBid(topBid || 'N/A');
    
    } catch (error) {
      showErrorDialog({
        message: 'Cannot get bids',
        note: error?.message || 'Unknown error',
      });
    } finally {
      setCheckingMarket(false);
    }
};

export const fetchLowestAsk = async (
  inputMarket = DEFAULT_MARKET_PAIR, 
  checkingMarket, 
  setCheckingMarket, 
  setLowestAsk, 
  showErrorDialog,
  orderToken,
  baseToken
) => {
    if (checkingMarket) return;
    try {
      setCheckingMarket(true);
      const pair = inputMarket;
      const result = await listMarket(
        pair, 
        'ask',
        '/timestamp,market,contract.amount,contract.ticker,order.amount,order.ticker',
        '', 
        'price', 
        'asc', 
        'all', 
        5,
        null
      );
      
      if (orderToken === 'NXS') {
        MULTIPLIER = 1e6;
      } else if (baseToken === 'NXS') {
        MULTIPLIER = 1e-6;
      } else {
        MULTIPLIER = 1;
      }

      const bottomAsk = (result[0]?.order.amount * MULTIPLIER) / result[0]?.contract.amount;
      setLowestAsk( bottomAsk || 'N/A');

    } catch (error) {
      showErrorDialog({
        message: 'Cannot get ask',
        note: error?.message || 'Unknown error',
      });
    } finally {
      setCheckingMarket(false);
    }
};