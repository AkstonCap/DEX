import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';

export default function TradeHistory() {
  const executedOrders = useSelector(
    (state) => state.ui.market.executedData.executedOrders
  );
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector(
    (state) => state.ui.market.marketPairs.quoteToken
  );

  const bids = executedOrders && Array.isArray(executedOrders.bids)
    ? executedOrders.bids
    : [];
  const asks = executedOrders && Array.isArray(executedOrders.asks)
    ? executedOrders.asks
    : [];

  // If no orders, display “No executed orders” row
  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="mt2">
        <FieldSet legend="Trade History">
          <table>
            <thead>
              <tr>
                <th>Price [{quoteToken}/{baseToken}]</th>
                <th>Amount {baseToken}</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="3">No executed orders</td>
              </tr>
            </tbody>
          </table>
        </FieldSet>
      </div>
    );
  }

  // Adjust 'asks' so that order.amount matches contract.amount
  asks.forEach((element) => {
    element.order.amount = element.contract.amount;
  });

  // Merge and sort the executed orders
  const sortedExecutedOrders = [...bids, ...asks].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Map each order to a table row
  const rows = sortedExecutedOrders.map((order, index) => (
    <tr key={index}>
      <td>{`${order.price} ${quoteToken}`}</td>
      <td>{`${order.order.amount} ${baseToken}`}</td>
      <td>{new Date(order.timestamp).toLocaleString()}</td>
    </tr>
  ));

  return (
    <div className="mt2">
      <FieldSet legend="Trade History">
        <table>
          <thead>
            <tr>
              <th>Price [{quoteToken}/{baseToken}]</th>
              <th>Amount {baseToken}</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
      </FieldSet>
    </div>
  );
}