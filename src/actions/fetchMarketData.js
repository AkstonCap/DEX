import { showErrorDialog } from 'nexus-module';

import { fetchOrderBook } from 'actions/fetchOrderBook';
import { fetchExecuted } from 'actions/fetchExecuted';

export const fetchMarketData = () => async (dispatch, getState) => {
  const state = getState();
  const marketPair = state.ui.market.marketPair;

  try {
    await dispatch(fetchOrderBook(marketPair));
    await dispatch(fetchExecuted(marketPair, '1y'));
  } catch (error) {
    dispatch(
      showErrorDialog({
        message: 'Cannot fetch data',
        note: error?.message || 'Unknown error',
      })
    );
  }
};