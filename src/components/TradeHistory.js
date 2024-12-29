import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';

export const renderExecutedOrders = () => {
  const executedOrders = useSelector((state) => state.ui.market.executedData.executedOrders);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
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
      <td>{`${order.price} ${quoteToken}`}</td>
      <td>{`${order.order.amount} ${baseToken}`}</td>
      <td>{new Date(order.timestamp).toLocaleString()}</td>
    </tr>
  ));
};

export default function TradeHistory() {
  
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);

  return (
    <div className="mt2">
      <FieldSet legend="Transactions">
          <div>
            <table>
              <thead>
                <tr>
                  <th>Price [{quoteToken}/{baseToken}]</th>
                  <th>Amount {baseToken}</th>
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