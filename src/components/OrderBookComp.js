import { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, Modal } from 'nexus-module';
import { setOrder, setAvailableOrdersAtPrice } from 'actions/actionCreators';
import { OrderTable, OrderbookTableHeader, OrderbookTableRow, formatTokenName } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';


export default function OrderBookComp({ num }) {
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
      level.totalBase += parseFloat(order.type === 'bid' ? order.order.amount : order.contract.amount);
      level.totalQuote += parseFloat(order.type === 'bid' ? order.contract.amount : order.order.amount);
    });
    
    return Array.from(priceMap.values());
  };

  const handlePriceLevelClick = (priceLevel) => {
    // Set available orders at this price level for dropdown selection in TradeForm
    dispatch(setAvailableOrdersAtPrice(priceLevel.orders, priceLevel.price, priceLevel.type));
  };

  const handleOrderSelect = (order) => {
    if (order.type === 'ask') {
      dispatch(setOrder(order.txid, order.price, order.order.amount, order.type, order.market, 'execute'));
    } else if (order.type === 'bid') {
      dispatch(setOrder(order.txid, order.price, order.contract.amount, order.type, order.market, 'execute'));
    }
    setOrderSelectionDialog(null);
  };

  const renderTableBids = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const aggregated = aggregateOrdersByPrice(data);
    const len = aggregated.length;
    return aggregated.slice(0, Math.min(num, len)).map((priceLevel, index) => (
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

  const renderTableAsks = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const aggregated = aggregateOrdersByPrice(data);
    const len = aggregated.length;
    return aggregated.slice(Math.max(len-num, 0), len).map((priceLevel, index) => (
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