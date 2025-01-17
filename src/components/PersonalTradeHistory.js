import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';

export default function PersonalTradeHistory() {
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const myTrades = useSelector((state) => state.ui.market.myTrades);

  // If no trades, display a single table row saying "No trades"
  if (!myTrades || myTrades.executed?.length === 0 ) {
    return (
      <div>
        <FieldSet legend="My Trades">
          <table>
            <tbody>
              <tr>
                <td colSpan="3">No trades</td>
              </tr>
            </tbody>
          </table>
        </FieldSet>
      </div>
    );
  } else {

  // Adjust "asks" so that order.amount matches contract.amount
    
  // Merge and sort
    const sortedTrades = myTrades.executed.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

  // Map each trade to a table row
    const rows = sortedTrades.map((trade, index) => (
      <tr key={index}>
        <td>{`${trade.price} ${quoteToken}`}</td>
        <td>{`${trade.order.amount} ${baseToken}`}</td>
        <td>{new Date(trade.timestamp).toLocaleString()}</td>
      </tr>
    ));

    return (
      <div>
        <FieldSet legend="My Trades">
          <table>
            <thead>
              <tr>
                <th>Price</th>
                <th>Amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </FieldSet>
      </div>
    );
  }
}