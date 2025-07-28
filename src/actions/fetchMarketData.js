import { showErrorDialog } from 'nexus-module';
import { fetchOrderBook } from 'actions/fetchOrderBook';
import { fetchExecuted } from 'actions/fetchExecuted';
//import { useDispatch } from 'react-redux';

export const fetchMarketData = () => async (dispatch, getState) => {
  const state = getState();
  const marketPair = state.ui.market.marketPairs.marketPair;

  try {
    
    await dispatch(fetchOrderBook(marketPair));
    await dispatch(fetchExecuted());
    return true; // Return success indicator
  
  } catch (error) {
    dispatch(
      showErrorDialog({
        message: 'Cannot fetch market data (fetchMarketData)',
        note: error?.message || 'Unknown error',
      })
    );
    return null; // Return null for error
  }
};