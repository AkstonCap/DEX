import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { OrderTable, MyTradeTableRow, MyUnconfirmedOrdersTableRow } from './styles';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';

export default function PersonalTradeHistory() {
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const myTrades = useSelector((state) => state.ui.market.myTrades);
  const myUnconfirmedTrades = useSelector((state) => state.ui.market.myUnconfirmedTrades?.unconfirmedTrades || []);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);

  // Check if there's an error loading trades
  const hasError = myTrades?.error;

  // Helper function to get decimals for a given ticker
  function decimalsForTicker(ticker, baseToken, quoteToken, baseTokenDecimals, quoteTokenDecimals) {
    if (ticker === baseToken) return baseTokenDecimals;
    if (ticker === quoteToken) return quoteTokenDecimals;
    return 3; // default/fallback
  }

  // Filter unconfirmed trades to only show ones for the current market pair
  const filteredUnconfirmedTrades = myUnconfirmedTrades.filter(trade => {
    return (trade.contract?.ticker === baseToken && trade.order?.ticker === quoteToken) ||
           (trade.contract?.ticker === quoteToken && trade.order?.ticker === baseToken);
  });

  // If there's an error loading trades, display error message
  if (hasError) {
    return (
      <div>
        <FieldSet legend="My Trades">
          <table>
            <tbody>
              <tr>
                <td colSpan="3" style={{color: '#ff6b6b', fontStyle: 'italic'}}>
                  Unable to load trade history: {myTrades.error}
                </td>
              </tr>
            </tbody>
          </table>
        </FieldSet>
      </div>
    );
  }

  // If no trades, display a single table row saying "No trades"
  if ((!myTrades || myTrades.executed?.length === 0) && (!filteredUnconfirmedTrades || filteredUnconfirmedTrades?.length === 0)) {
    
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
    
    // Combine confirmed and unconfirmed trades with safety checks
    const allTrades = [
      ...((myTrades?.executed || []).map(trade => ({
        ...trade,
        isUnconfirmed: false
      }))),
      ...(filteredUnconfirmedTrades.map(trade => ({
        ...trade,
        isUnconfirmed: true
      })))
    ];
    
    // Merge and sort
    const sortedTrades = allTrades.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

  // Map each trade to a table row
    const rows = sortedTrades.map((trade, index) => {
      
      if (trade.isUnconfirmed) {
        // Handle unconfirmed trades with different structure
        return (
          <MyUnconfirmedOrdersTableRow
            key={`unconfirmed-trade-${index}`}
            asset_1={trade.asset_1}
            asset_2={trade.asset_2}
            executedAmount={trade.amount}
            executedTotal={trade.total}
            type={trade.type}
            timestamp={trade.timestamp}
            status="⏳ Pending confirmation"
            isUnconfirmed={true}
          />
        );
      }

      const contractDecimals = decimalsForTicker(
        trade.contract.ticker,
        baseToken,
        quoteToken,
        baseTokenDecimals,
        quoteTokenDecimals
      );

      return (
        <MyTradeTableRow key={index} orderType={trade.type}>
          <td>
            {formatNumberWithLeadingZeros(
              parseFloat(trade.price), 
              3,
              quoteTokenDecimals
              )
            }
          </td>
          <td>
            {formatNumberWithLeadingZeros(
              parseFloat(trade.contract.amount), 
              3,
              contractDecimals
              )
            } {trade.contract.ticker}
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
