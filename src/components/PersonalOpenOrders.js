import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { MyOrdersTable, MyOrdersTableRow, OrderbookTableHeader } from './styles';
import DeleteButton from './DeleteButton';

export default function PersonalOpenOrders() {
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const myOrders = useSelector((state) => state.ui.market.myOrders.orders);
  const myUnconfirmedOrders = useSelector((state) => state.ui.market.myOrders.unconfirmedOrders);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);

  // Helper function to get decimals for a given ticker
  function decimalsForTicker(ticker, baseToken, quoteToken, baseTokenDecimals, quoteTokenDecimals) {
    if (ticker === baseToken) return baseTokenDecimals;
    if (ticker === quoteToken) return quoteTokenDecimals;
    return 3; // default/fallback
  }

  // If no orders, display “No orders” row
  if (!myOrders || myOrders?.length === 0 ) {
    return (
      <div>
        <FieldSet legend="My Open Orders">
          <table>
            <tbody>
              <tr>
                <td colSpan="3">No orders</td>
              </tr>
            </tbody>
          </table>
        </FieldSet>
      </div>
    );
  } else {

    // Merge and sort
    const sortedOrders = myOrders.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Convert each order into a table row
    const rows = sortedOrders.map((order, index) => {

      const contractDecimals = decimalsForTicker(
        order.contract.ticker,
        baseToken,
        quoteToken,
        baseTokenDecimals,
        quoteTokenDecimals
      );
      const orderDecimals = decimalsForTicker(
        order.order.ticker,
        baseToken,
        quoteToken,
        baseTokenDecimals,
        quoteTokenDecimals
      );

      return (
        <MyOrdersTableRow key={index} orderType={order.type}>
          <td>{parseFloat(order.price).toFixed(Math.min(4, quoteTokenDecimals))}</td>
          <td>
            {parseFloat(order.contract.amount).toFixed(Math.min(4, contractDecimals))} {order.contract.ticker}
          </td>
          <td>
            {parseFloat(order.order.amount).toFixed(Math.min(4, orderDecimals))} {order.order.ticker}
          </td>
          <td>{new Date(order.timestamp * 1000).toLocaleString()}</td>
          <td><DeleteButton txid={order.txid} /></td>
        </MyOrdersTableRow>
      );
    });

    return (
      <div>
        <FieldSet legend="My Open Orders">
          <MyOrdersTable>
            <OrderbookTableHeader>
              <tr>
                <th>Price</th>
                <th>Sell amount</th>
                <th>Buy amount</th>
                <th>Time</th>
              </tr>
            </OrderbookTableHeader>
            <tbody>{rows}</tbody>
          </MyOrdersTable>
        </FieldSet>
      </div>
    );
  }
}