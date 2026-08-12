import { showErrorDialog } from 'nexus-module';
import { fetchOrderBook } from 'actions/fetchOrderBook';
import { fetchExecuted } from 'actions/fetchExecuted';
//import { useDispatch } from 'react-redux';

export const fetchMarketData = () => async (dispatch) => {
  try {
    // Both thunks read the current market pair straight from the store
    await dispatch(fetchOrderBook());
    await dispatch(fetchExecuted());
    return true; // Return success indicator
  
  } catch (error) {
    showErrorDialog({
      message: 'Cannot fetch market data (fetchMarketData)',
      note: error?.message || 'Unknown error',
    });
    return null; // Return null for error
  }
};