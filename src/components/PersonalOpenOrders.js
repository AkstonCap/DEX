import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { MyOrdersTable, MyOrdersTableRow } from './styles';
import DeleteButton from './DeleteButton';

export default function PersonalOpenOrders() {
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const myOrders = useSelector((state) => state.ui.market.myOrders.orders);

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

    /*
    const myAsks = myOrders.filter((order) => order.type === 'ask');
    // Adjust 'asks' so that order.amount matches contract.amount
    if (myAsks.length > 0) {
      myOrders.forEach((element) => {
        if (myOrders.type === 'ask') {
          element.order.amount = element.contract.amount;
        }
      });
    };
    */
    // Merge and sort
    const sortedOrders = myOrders.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    // Convert each order into a table row
    const rows = sortedOrders.map((order, index) => (
      <MyOrdersTableRow key={index} orderType={order.type}>
        <td>{`${order.price} ${quoteToken}`}</td>
        <td>{`${order.contract.amount} ${order.contract.ticker}`}</td>
        <td>{`${order.order.amount} ${order.order.ticker}`}</td>
        <td>{new Date(order.timestamp).toLocaleString()}</td>
        <DeleteButton txid={order.txid} />
      </MyOrdersTableRow>
    ));

    return (
      <div>
        <FieldSet legend="My Open Orders">
          <MyOrdersTable>
            <thead>
              <tr>
                <th>Price</th>
                <th>Amount</th>
                <th>Amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </MyOrdersTable>
        </FieldSet>
      </div>
    );
  }
}