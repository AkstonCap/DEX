import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { OrderTable } from './styles';

export default function PersonalOpenOrders() {
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const myOrders = useSelector((state) => state.ui.market.myOrders);

  // If no orders, display “No orders” row
  if (!myOrders || (myOrders.bids?.length === 0 && myOrders.asks?.length === 0)) {
    return (
      <div className="mt2">
        <FieldSet legend="My Open Orders">
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
                <td colSpan="3">No orders</td>
              </tr>
            </tbody>
          </table>
        </FieldSet>
      </div>
    );
  }

  // Adjust 'asks' so that order.amount matches contract.amount
  myOrders.asks.forEach((element) => {
    element.order.amount = element.contract.amount;
  });

  // Merge and sort
  const sortedOrders = [...myOrders.bids, ...myOrders.asks].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Convert each order into a table row
  const rows = sortedOrders.map((order, index) => (
    <tr key={index}>
      <td>{`${order.price} ${quoteToken}`}</td>
      <td>{`${order.order.amount} ${baseToken}`}</td>
      <td>{new Date(order.timestamp).toLocaleString()}</td>
    </tr>
  ));

  return (
    <div className="mt2">
      <FieldSet legend="My Open Orders">
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