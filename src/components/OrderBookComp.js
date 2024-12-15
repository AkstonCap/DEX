import { useSelector } from 'react-redux';

export default function OrderBookComp() {
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const orderToken = useSelector((state) => state.ui.market.marketPairs.orderToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);

  const renderTableRows = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    return data.slice(0, 5).map((item, index) => (
      <tr key={index}>
        <td>{item.price}</td>
        <td>{`${item.order.amount} ${orderToken}`}</td>
        <td>{`${item.contract.amount} ${baseToken}`}</td>
      </tr>
    ));
  };

  return (
    <div className="mt2">
      <FieldSet legend="Order Book">
          <div style={gridStyleOrderbook}>
            {/* Left Column */}
            <div>
              <p>Asks</p>
              <table>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Order Token Amount</th>
                    <th>Base Token Amount</th>
                  </tr>
                </thead>
                <tbody>{renderTableRows(orderBook.asks)}</tbody>
              </table>
            </div>
            <div>
              <p>Bids</p>
              <table>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Order Token Amount</th>
                    <th>Base Token Amount</th>
                  </tr>
                </thead>
                <tbody>{renderTableRows(orderBook.bids)}</tbody>
              </table>
            </div>
          </div>
        </FieldSet>
    </div>
  );
}