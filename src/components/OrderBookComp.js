import React from 'react';
import { useSelector } from 'react-redux';

export default function OrderBookComp() {
  const orderBook = useSelector((state) => state.ui.market.orderBook);

  return (
    <div className="order-book">
      <h3>Order Book</h3>
      {/* Render order book data */}
    </div>
  );
}