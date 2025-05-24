import { useSelector, useDispatch } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { setOrder } from 'actions/actionCreators';
import { OrderTable, OrderbookTableHeader, OrderbookTableRow, formatTokenName } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';

export default function AskBook({ num }) {
  const dispatch = useDispatch();
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);

  const handleOrderClick = (order) => {
    dispatch(setOrder(order.txid, order.price, order.order.amount, order.type, order.market, 'execute'));
  };

  const renderAsks = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const dataSorted = data.sort((a, b) => a.price - b.price);
    const len = data.length;
    return dataSorted.slice(Math.max(len-num, 0), len).map((item, index) => (
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
      <FieldSet legend="Asks">
          <div>
            <OrderTable>
              <OrderbookTableHeader>
                <tr>
                  <th>Price [{formatTokenName(quoteToken)}]</th>
                  <th>Amount [{formatTokenName(baseToken)}]</th>
                  <th>Amount [{formatTokenName(quoteToken)}]</th>
                </tr>
              </OrderbookTableHeader>
              <tbody>{renderAsks(orderBook.asks)}</tbody>
            </OrderTable>
          </div>
        </FieldSet>
    </div>
  );
}