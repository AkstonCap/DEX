import { useSelector, useDispatch } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { setOrder } from 'actions/actionCreators';
import { OrderTable, OrderbookTableHeader, OrderbookTableRow, formatTokenName } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';


export default function OrderBookComp({ num }) {
  const dispatch = useDispatch();
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);

  const handleOrderClick = (order) => {
    if (order.type === 'ask') {
      dispatch(setOrder(order.txid, order.price, order.order.amount, order.type, order.market, 'execute'));
    } else if (order.type === 'bid') {
      dispatch(setOrder(order.txid, order.price, order.contract.amount, order.type, order.market, 'execute'));
    }
  };

  const renderTableBids = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const len = data.length;
    return data.slice(0, Math.min(num, len)).map((item, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handleOrderClick(item)}
      orderType={item.type}
      >
      <td>
        {/*parseFloat(item.price).toFixed(Math.min(4, quoteTokenDecimals))*/}
        {formatNumberWithLeadingZeros(
          parseFloat(item.price), 
          3,
          quoteTokenDecimals
          )
        }
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.order.amount), 
          3,
          baseTokenDecimals
          )
        }
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.contract.amount), 
          3,
          quoteTokenDecimals
          )
        }
      </td>
      </OrderbookTableRow>
    ));
  };

  const renderTableAsks = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const len = data.length;
    return data.slice(Math.max(len-num, 0), len).map((item, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handleOrderClick(item)}
      orderType={item.type}
    >
      <td>
        {/*parseFloat(item.price).toFixed(Math.min(4, quoteTokenDecimals))*/}
        {formatNumberWithLeadingZeros(
          parseFloat(item.price), 
          3,
          quoteTokenDecimals
          )
        }
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.contract.amount), 
          3,
          baseTokenDecimals
          )
        }
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.order.amount), 
          3,
          quoteTokenDecimals
          )
        }
      </td>
    </OrderbookTableRow>
    ));
  };

  return (
    <div>
      <FieldSet legend="Order Book">
          <div>
            <OrderTable>
              <OrderbookTableHeader>
                <tr>
                  <th>Price [{formatTokenName(quoteToken)}]</th>
                  <th>Amount [{formatTokenName(baseToken)}]</th>
                  <th>Amount [{formatTokenName(quoteToken)}]</th>
                </tr>
              </OrderbookTableHeader>
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