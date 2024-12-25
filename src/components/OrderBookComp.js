import { useSelector, useDispatch } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { setOrder } from 'actions/actionCreators';
import { gridStyleOrderbook } from './styles';

export default function OrderBookComp() {
  const dispatch = useDispatch();
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);

  const handleOrderClick = (order) => {
    if (order.type === 'ask') {
      dispatch(setOrder(order.address, order.price, order.order.amount));
    } else if (order.type === 'bid') {
      dispatch(setOrder(order.address, order.price, order.contract.amount));
    }
  };

  const renderTableBids = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    return data.slice(0, 5).map((item, index) => (
      <tr key={index}> onClick={() => handleOrderClick(item)}
        <td>{item.price}</td>
        <td>{`${item.order.amount} ${baseToken}`}</td>
        <td>{`${item.contract.amount} ${quoteToken}`}</td>
      </tr>
    ));
  };

  const renderTableAsks = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    return data.slice(0, 5).map((item, index) => (
      <tr key={index}> onClick={() => handleOrderClick(item)}
        <td>{item.price}</td>
        <td>{`${item.contract.amount} ${baseToken}`}</td>
        <td>{`${item.order.amount} ${quoteToken}`}</td>
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
                    <th>Amount {baseToken}</th>
                    <th>Amount {quoteToken}</th>
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
                    <th>Amount {baseToken}</th>
                    <th>Amount {quoteToken}</th>
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