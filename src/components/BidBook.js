import { useSelector, useDispatch } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { setOrder } from 'actions/actionCreators';
import { OrderTable, OrderbookTableHeader, OrderbookTableRow } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';

export default function BidBook({ num }) {
  const dispatch = useDispatch();
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);

  const handleOrderClick = (order) => {
    dispatch(setOrder(order.txid, order.price, order.contract.amount, order.type, order.market, 'execute'));
  };

  const renderBids = (data) => {
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
          3
          )
        }
      </td>
      <td>{`${parseFloat(item.order.amount).toFixed(Math.min(4, baseTokenDecimals))} ${item.order.ticker}`}</td>
      <td>{`${parseFloat(item.contract.amount).toFixed(Math.min(4, quoteTokenDecimals))} ${item.contract.ticker}`}</td>
      </OrderbookTableRow>
    ));
  };

  return (
    <div>
      <FieldSet legend="Bids">
          <div>
            <OrderTable>
              <OrderbookTableHeader>
                <tr>
                  <th>Price</th>
                  <th>Amount [{baseToken}]</th>
                  <th>Amount [{quoteToken}]</th>
                </tr>
              </OrderbookTableHeader>
              <tbody>{renderBids(orderBook.bids)}</tbody>
            </OrderTable>
          </div>
        </FieldSet>
    </div>
  );
}