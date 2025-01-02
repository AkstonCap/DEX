import { useSelector, useDispatch } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { setOrder } from 'actions/actionCreators';
import { OrderTable } from './styles';

export default function OrderBookComp() {
  const dispatch = useDispatch();
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);

  const handleOrderClick = (order) => {
    if (order.type === 'ask') {
      dispatch(setOrder(order.txid, order.price, order.order.amount, order.type, order.market));
    } else if (order.type === 'bid') {
      dispatch(setOrder(order.txid, order.price, order.contract.amount, order.type, order.market));
    }
  };

  const renderTableBids = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    return data.slice(0, 5).map((item, index) => (
      <tr key={index} onClick={() => handleOrderClick(item)}>
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
      <tr key={index} onClick={() => handleOrderClick(item)}>
        <td>{item.price}</td>
        <td>{`${item.contract.amount} ${baseToken}`}</td>
        <td>{`${item.order.amount} ${quoteToken}`}</td>
      </tr>
    ));
  };

  return (
    <div className="mt2">
      <FieldSet legend="Order Book">
          <div>
            {/* Left Column */}
            <div>
              <p>Asks</p>
              <OrderTable>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Amount {baseToken}</th>
                    <th>Amount {quoteToken}</th>
                  </tr>
                </thead>
                <tbody>{renderTableAsks(orderBook.asks)}</tbody>
              </OrderTable>
            </div>
            <div>
              <p>Bids</p>
              <OrderTable>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Amount {baseToken}</th>
                    <th>Amount {quoteToken}</th>
                  </tr>
                </thead>
                <tbody>{renderTableBids(orderBook.bids)}</tbody>
              </OrderTable>
            </div>
          </div>
        </FieldSet>
    </div>
  );
}