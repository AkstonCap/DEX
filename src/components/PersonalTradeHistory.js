import { FieldSet } from 'nexus-module';
import { useSelector } from 'react-redux';
//import { useSelector } from 'react-redux';

export const renderMyTrades = async() => {

  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  
  const myTrades = useSelector((state) => state.ui.market.myTrades);

  if (myTrades.bids?.length === 0 && myTrades.asks?.length === 0) {
    return (
      <tr>
        <td colSpan="3">No trades</td>
      </tr>
    );
  }

  myTrades.asks.forEach((element) => {
    element.order.amount = element.contract.amount;
  });
  const sortedTrades = [...myTrades.bids, ...myTrades.asks].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return sortedTrades.map((order, index) => (
    <tr key={index}>
      <td>{`${order.price} ${quoteToken}`}</td>
      <td>{`${order.order.amount} ${baseToken}`}</td>
      <td>{new Date(order.timestamp).toLocaleString()}</td>
    </tr>
  ));
};

export default function PersonalTradeHistory() {
    //const executedOrders = useSelector((state) => state.ui.market.executedData.executedOrders);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  return (
    <div className="mt2">
        <FieldSet legend="My Trades">
          <div>
            <table>
              <thead>
                <tr>
                  <th>Price [{quoteToken}/{baseToken}]</th>
                  <th>Amount {baseToken}</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {renderMyTrades()}
              </tbody>
            </table>
          </div>
        </FieldSet>
    </div>
  );
}