import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { OrderTable, TradeTableRow } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';

export default function TradeHistory({num}) {
  const executedOrders = useSelector(
    (state) => state.ui.market.executedOrders
  );
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector(
    (state) => state.ui.market.marketPairs.quoteToken
  );
  const baseTokenDecimals = useSelector(
    (state) => state.ui.market.marketPairs.baseTokenDecimals
  );
  const quoteTokenDecimals = useSelector(
    (state) => state.ui.market.marketPairs.quoteTokenDecimals
  );

  const bids = executedOrders && Array.isArray(executedOrders.bids)
    ? executedOrders.bids
    : [];
  const asks = executedOrders && Array.isArray(executedOrders.asks)
    ? executedOrders.asks
    : [];

  // If no orders, display “No executed orders” row
  if (bids?.length === 0 && asks?.length === 0) {
    return (
      <div>
        <FieldSet legend="Trade History">
          <table>
            <tbody>
              <tr>
                <td colSpan="3">No executed orders</td>
              </tr>
            </tbody>
          </table>
        </FieldSet>
      </div>
    );
  }

  // Helper function to get decimals for a given ticker
  function decimalsForTicker(ticker, baseToken, quoteToken, baseTokenDecimals, quoteTokenDecimals) {
    if (ticker === baseToken) return baseTokenDecimals;
    if (ticker === quoteToken) return quoteTokenDecimals;
    return 3; // default/fallback
  }

  // Adjust 'asks' so that order.amount matches contract.amount
  /*asks.forEach((element) => {
    //element.order.amount = element.contract.amount;
    element.baseAmount = element.contract.amount;
    element.quoteAmount = element.order.amount;
  });
  bids.forEach((element) => {
    element.baseAmount = element.order.amount;
    element.quoteAmount = element.contract.amount;
  });*/

  // Merge and sort the executed orders
  const sortedExecutedOrders = [...bids, ...asks].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  // Map each order to a table row
  const rows = sortedExecutedOrders.slice(0, num).map((order, index) => {

    const contractDecimals = decimalsForTicker(
      order.contract.ticker,
      baseToken,
      quoteToken,
      baseTokenDecimals,
      quoteTokenDecimals
    );

    return (
      <TradeTableRow key={index} orderType={order.type}>
        <td>
          {/*
          parseFloat(order.price).toFixed(Math.min(4, quoteTokenDecimals))
          */}
          {formatNumberWithLeadingZeros(
              parseFloat(order.price), 
              3
            )
          }
        </td>
        <td>{parseFloat(order.contract.amount).toFixed(Math.min(4, contractDecimals))} {order.contract.ticker}</td>
        <td>{new Date(order.timestamp*1000).toLocaleString()}</td>
      </TradeTableRow>
    );
  });

  return (
    <div>
      <FieldSet legend="Trade History">
        <OrderTable>
          <thead>
            <tr>
              <th>Price [{quoteToken}]</th>
              <th>Buy amount</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {rows}
          </tbody>
        </OrderTable>
      </FieldSet>
    </div>
  );
}

