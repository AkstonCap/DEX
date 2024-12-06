import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { showErrorDialog } from 'nexus-module';

import { fetchLastPrice } from 'actions/fetchLastPrice';
import { fetchHighestBid, fetchLowestAsk } from 'actions/fetchFirstOrders';
import { fetchVolume } from 'actions/fetchVolume';
import { fetchOrderBook } from 'actions/fetchOrderBook';
import { fetchExecuted } from 'actions/fetchExecuted';

export const fetchMarketData = () => async (dispatch, getState) => {
  const state = getState();
  const marketPair = state.ui.market.marketPair;
  const orderToken = state.ui.market.orderToken;
  const baseToken = state.ui.market.baseToken;

  try {
    //await dispatch(fetchLastPrice(marketPair, orderToken, baseToken));
    await dispatch(fetchHighestBid(marketPair, orderToken, baseToken));
    await dispatch(fetchLowestAsk(marketPair, orderToken, baseToken));
    //await dispatch(fetchVolume(marketPair, '1y'));
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