import React from 'react';
import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';

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
    asks.forEach((element) => {
      element.order.amount = element.contract.amount;
    });
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
    <div className="mt2">
      <FieldSet legend="Executed Orders">
          <div>
            <table>
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>{renderExecutedOrders()}</tbody>
            </table>
          </div>
        </FieldSet>
    </div>
  );
}