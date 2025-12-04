import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, Modal } from 'nexus-module';
import { setOrder, setAvailableOrdersAtPrice } from 'actions/actionCreators';
import { OrderTable, OrderbookTableHeader, OrderbookTableRow, formatTokenName } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';

export default function AskBook({ num }) {
  const dispatch = useDispatch();
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);
  const [orderSelectionDialog, setOrderSelectionDialog] = useState(null);

  const aggregateOrdersByPrice = (orders) => {
    if (!Array.isArray(orders)) return [];
    
    const priceMap = new Map();
    orders.forEach(order => {
      const price = parseFloat(order.price);
      if (!priceMap.has(price)) {
        priceMap.set(price, {
          price: price,
          orders: [],
          totalBase: 0,
          totalQuote: 0,
          type: order.type
        });
      }
      const level = priceMap.get(price);
      level.orders.push(order);
      level.totalBase += parseFloat(order.contract.amount);
      level.totalQuote += parseFloat(order.order.amount);
    });
    
    return Array.from(priceMap.values());
  };

  const handlePriceLevelClick = (priceLevel) => {
    dispatch(setAvailableOrdersAtPrice(priceLevel.orders, priceLevel.price, priceLevel.type));
  };

  const handleOrderSelect = (order) => {
    dispatch(setOrder(order.txid, order.price, order.order.amount, order.type, order.market, 'execute'));
    setOrderSelectionDialog(null);
  };

  const renderAsks = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const aggregated = aggregateOrdersByPrice(data);
    const dataSorted = aggregated.sort((a, b) => a.price - b.price);
    const len = dataSorted.length;
    return dataSorted.slice(Math.max(len-num, 0), len).map((priceLevel, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handlePriceLevelClick(priceLevel)}
      orderType={priceLevel.type}
    >
      <td>
        {formatNumberWithLeadingZeros(
          priceLevel.price, 
          3,
          quoteTokenDecimals
          )}
        {priceLevel.orders.length > 1 && ` (${priceLevel.orders.length})`}
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          priceLevel.totalBase, 
          3,
          baseTokenDecimals
          )
        }
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          priceLevel.totalQuote, 
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