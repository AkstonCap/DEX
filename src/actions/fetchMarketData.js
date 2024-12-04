import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { showErrorDialog } from 'nexus-module';

import { fetchLastPrice } from 'actions/fetchLastPrice';
import { fetchHighestBid, fetchLowestAsk } from 'actions/fetchFirstOrders';
import { fetchVolume } from 'actions/fetchVolume';
import { fetchOrderBook } from 'actions/fetchOrderBook';
import { fetchExecuted } from 'actions/fetchExecuted';

export const fetchMarketData = async () => {
    const marketPair = useSelector((state) => state.ui.market.marketPair);
    const orderToken = useSelector((state) => state.ui.market.orderToken);
    const baseToken = useSelector((state) => state.ui.market.baseToken);
    try {
        await fetchLastPrice(marketPair, orderToken, baseToken);
        await fetchHighestBid(marketPair, orderToken, baseToken);
        await fetchLowestAsk(marketPair, orderToken, baseToken);
        await fetchVolume(marketPair, '1y');
        await fetchOrderBook(marketPair);
        await fetchExecuted(marketPair, '1y');
        } catch (error) {
        showErrorDialog({
            message: 'Cannot fetch data',
            note: error?.message || 'Unknown error',
        });
    }
}