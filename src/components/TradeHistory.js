import React from 'react';
import { useSelector } from 'react-redux';

export default function TradeHistory() {
  const executedOrders = useSelector((state) => state.ui.market.executedData.executedOrders);

  const renderExecutedOrders = () => {
    const bids = executedOrders && Array.isArray(executedOrders.bids) ? executedOrders.bids : [];
    const asks = executedOrders && Array.isArray(executedOrders.asks) ? executedOrders.asks : [];

    if (bids.length === 0 && asks.length === 0) {
      return (
        <tr>
          <td colSpan="3">No executed orders</td>
        </tr>
      );
    }

    const sortedExecutedOrders = [...bids, ...asks].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return sortedExecutedOrders.map((order, index) => (
      <tr key={index}>
        <td>{`${order.price} ${baseToken}`}</td>
        <td>{`${order.order.amount} ${orderToken}`}</td>
        <td>{new Date(order.timestamp).toLocaleString()}</td>
      </tr>
    ));
  };

  return (
    <div className="trade-history">
      <h3>Trade History</h3>
      {/* Render trade history data */}
    </div>
  );
}