import React from 'react';
import { useSelector } from 'react-redux';
import OrderBook from './OrderBook';
import TradeForm from './TradeForm';
import TradeHistory from './TradeHistory';

export default function Trade() {
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);

  return (
    <div className="trading-dashboard">
      <h1>Trading Dashboard</h1>
      <h2>{marketPair}</h2>
      <div className="trading-container">
        <div className="order-book-section">
          <OrderBook />
        </div>
        <div className="trade-form-section">
          <TradeForm />
        </div>
        <div className="trade-history-section">
          <TradeHistory />
        </div>
      </div>
    </div>
  );
}