import { FieldSet, apiCall } from 'nexus-module';
import { useSelector } from 'react-redux';

export const renderMyOpenOrders = async() => {
  
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  
  const myOrders = useSelector((state) => state.ui.market.myOrders);

  if (myOrders.bids?.length === 0 && myOrders.asks?.length === 0) {
    return (
      <tr>
        <td colSpan="3">No trades</td>
      </tr>
    );
  }

  myOrders.asks.forEach((element) => {
    element.order.amount = element.contract.amount;
  });
  const sortedOrders = [...myOrders.bids, ...myOrders.asks].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  return sortedOrders.map((order, index) => (
    <tr key={index}>
      <td>{`${order.price} ${quoteToken}`}</td>
      <td>{`${order.order.amount} ${baseToken}`}</td>
      <td>{new Date(order.timestamp).toLocaleString()}</td>
    </tr>
  ));
};

export default function PersonalOpenOrders() {
    //const executedOrders = useSelector((state) => state.ui.market.executedData.executedOrders);

    return (
        <div className="mt2">
            <FieldSet legend="My Orders">
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
                            {renderMyOpenOrders()}
                        </tbody>
                    </table>
                </div>
            </FieldSet>
        </div>
    );
}