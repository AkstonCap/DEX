import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';

export default function OrderBookComp() {
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const orderToken = useSelector((state) => state.ui.market.marketPairs.orderToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);

  const renderTableBids = (data) => {
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

  const renderTableAsks = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    return data.slice(0, 5).map((item, index) => (
      <tr key={index}>
        <td>{item.price}</td>
        <td>{`${item.contract.amount} ${orderToken}`}</td>
        <td>{`${item.order.amount} ${baseToken}`}</td>
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
                    <th>Amount {orderToken}</th>
                    <th>Amount {baseToken}</th>
                  </tr>
                </thead>
                <tbody>{renderTableAsks(orderBook.asks)}</tbody>
              </table>
            </div>
            <div>
              <p>Bids</p>
              <table>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Amount {orderToken}</th>
                    <th>Amount {baseToken}</th>
                  </tr>
                </thead>
                <tbody>{renderTableBids(orderBook.bids)}</tbody>
              </table>
            </div>
          </div>
        </FieldSet>
    </div>
  );
}