import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { OrderTable, TradeTableRow } from './styles';

export default function TradeHistory({num}) {
  const executedOrders = useSelector(
    (state) => state.ui.market.executedOrders
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
  if (bids?.length === 0 && asks?.length === 0) {
    return (
      <div>
        <FieldSet legend="Trade History">
          <table>
            <tbody>
              <tr>
                <td colSpan="3">No executed orders (
                  {executedOrders?.bids.length}/{executedOrders?.asks.length}
                  )</td>
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
  const rows = sortedExecutedOrders.slice(0, num).map((order, index) => (
    <TradeTableRow key={index} orderType={order.type}>
      <td>{`${order.price} ${quoteToken}`}</td>
      <td>{`${order.order.amount} ${baseToken}`}</td>
      <td>{new Date(order.timestamp*1000).toLocaleString()}</td>
    </TradeTableRow>
  ));

  return (
    <div>
      <FieldSet legend="Trade History">
        <OrderTable>
          <thead>
            <tr>
              <th>Price</th>
              <th>Amount {baseToken}</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </OrderTable>
      </FieldSet>
    </div>
  );
}

