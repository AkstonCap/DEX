import { setLowestAsk } from './actionCreators';
import { listMarket, DEFAULT_MARKET_PAIR } from './listMarket';

const MULTIPLIER = 1e6;

export const fetchHighestBid = async (
  inputMarket = DEFAULT_MARKET_PAIR, 
  checkingMarket, 
  setCheckingMarket, 
  setHighestBid, 
  showErrorDialog
) => {
    if (checkingMarket) return;
    try {
      setCheckingMarket(true);
      const pair = inputMarket;
      const result = await listMarket(pair, 'bid', 'price', 'desc', 'all', 5);
      
      //const bids = [...result.bids];
      const topBid = (result[0]?.order.amount * MULTIPLIER) / bids[0]?.contract.amount;
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
  showErrorDialog
) => {
    if (checkingMarket) return;
    try {
      setCheckingMarket(true);
      const pair = inputMarket;
      const result = await listMarket(pair, 'ask', 'price', 'asc', 'all', 5);
      
      //const asks = [...result.asks];
      const topAsk = (result[0]?.order.amount * MULTIPLIER) / asks[0]?.contract.amount;
      setLowestAsk( topAsk || 'N/A');

    } catch (error) {
      showErrorDialog({
        message: 'Cannot get ask',
        note: error?.message || 'Unknown error',
      });
    } finally {
      setCheckingMarket(false);
    }
};