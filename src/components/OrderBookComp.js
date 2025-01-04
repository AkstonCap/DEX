import { useSelector, useDispatch } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { setOrder } from 'actions/actionCreators';
import { OrderTable, OrderbookTableRow } from './styles';

export default function OrderBookComp({ num }) {
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
    return data.slice(0, num).map((item, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handleOrderClick(item)}
      orderType={item.type}
      >
      <td>{item.price}</td>
      <td>{`${item.order.amount} ${baseToken}`}</td>
      <td>{`${item.contract.amount} ${quoteToken}`}</td>
      </OrderbookTableRow>
    ));
  };

  const renderTableAsks = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const len = data.length;
    return data.slice(len-num, len).map((item, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handleOrderClick(item)}
      orderType={item.type}
    >
      <td>{item.price}</td>
      <td>{`${item.contract.amount} ${baseToken}`}</td>
      <td>{`${item.order.amount} ${quoteToken}`}</td>
    </OrderbookTableRow>
    ));
  };

  return (
    <div>
      <FieldSet legend="Order Book">
          <div>
            <OrderTable>
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Amount [{baseToken}]</th>
                  <th>Amount [{quoteToken}]</th>
                </tr>
              </thead>
              <tbody>{renderTableAsks(orderBook.asks)}</tbody>
              <tbody>
                <tr>
                  <td 
                    colSpan="3" 
                    style={{ 
                      backgroundColor: '#505050', 
                      height: '1px', 
                      border: 'none' 
                      }}>
                  </td>
                </tr>
              </tbody>
              <tbody>{renderTableBids(orderBook.bids)}</tbody>
            </OrderTable>
          </div>
        </FieldSet>
    </div>
  );
}