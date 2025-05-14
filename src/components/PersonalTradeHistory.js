import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { OrderTable, MyTradeTableRow } from './styles';

export default function PersonalTradeHistory() {
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const myTrades = useSelector((state) => state.ui.market.myTrades);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);

  // Helper function to get decimals for a given ticker
  function decimalsForTicker(ticker, baseToken, quoteToken, baseTokenDecimals, quoteTokenDecimals) {
    if (ticker === baseToken) return baseTokenDecimals;
    if (ticker === quoteToken) return quoteTokenDecimals;
    return 3; // default/fallback
  }

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
    
  // Merge and sort
    const sortedTrades = myTrades.executed.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

  // Map each trade to a table row
    const rows = sortedTrades.map((trade, index) => {

      const contractDecimals = decimalsForTicker(
        trade.contract.ticker,
        baseToken,
        quoteToken,
        baseTokenDecimals,
        quoteTokenDecimals
      );

      return (
        <MyTradeTableRow key={index} orderType={trade.type}>
          <td>{parseFloat(trade.price).toFixed(Math.min(4, quoteTokenDecimals))}</td>
          <td>
            {parseFloat(trade.contract.amount).toFixed(Math.min(4, contractDecimals))} {trade.contract.ticker}
          </td>
          <td>{new Date(trade.timestamp * 1000).toLocaleString()}</td>
        </MyTradeTableRow>
      );
      
    });

    return (
      <div>
        <FieldSet legend="My Trades">
          <OrderTable>
            <thead>
              <tr>
                <th>Price [{quoteToken}]</th>
                <th>Buy amount</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </OrderTable>
        </FieldSet>
      </div>
    );
  }
}
