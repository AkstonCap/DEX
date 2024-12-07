import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, Button } from 'nexus-module';

export default function Overview() {
  const dispatch = useDispatch();

  const marketPair = useSelector((state) => state.ui.market.marketPair);
  const baseToken = useSelector((state) => state.ui.market.baseToken);
  const orderToken = useSelector((state) => state.ui.market.orderToken);

  const orderBookAsks = useSelector((state) => state.ui.market.orderBookAsks);
  const orderBookBids = useSelector((state) => state.ui.market.orderBookBids);
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const executedBids = useSelector((state) => state.ui.market.executedBids);
  const executedAsks = useSelector((state) => state.ui.market.executedAsks);
  const executedOrders = useSelector((state) => state.ui.market.executedOrders);  

  useEffect(() => {
    const { baseTokenVolume, orderTokenVolume } = await fetchVolume(
      marketPair, 
      '1y',
      orderToken,
      baseToken
    );
    const lastPrice = executedOrders[0]?.price || 'N/A';
    const highestBid = orderBookBids[0]?.price || 'N/A';
    const lowestAsk = orderBookAsks[0]?.price || 'N/A';
  
    // Set interval to fetch data every 60 seconds
    const intervalId = setInterval(fetchData, 60000);
  
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [dispatch]);

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(2, auto)',
    gap: '10px',
  };

  const gridStyleOrderbook = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, auto)',
    gap: '10px',
  };

  const renderTableRows = (data) => {
    if (!Array.isArray(data)) {
      return null; 
    }
    return data.slice(0, 5).map((item, index) => (
      <tr key={index}>
        <td>{item.price}</td>
        <td>{item.orderTokenAmount}</td>
        <td>{item.baseTokenAmount}</td>
      </tr>
    ));
  };

  const renderExecutedOrders = () => {
    if (!Array.isArray(executedOrders) || executedOrders.length === 0 ) {
      return (
        <tr>
          <td colSpan="4">No executed orders</td>
        </tr>
      ); 
    }

    const sortedExecutedOrders= [...executedOrders].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    return sortedExecutedOrders.map((order, index) => (
      <tr key={index}>
        <td>{new Date(order.timestamp).toLocaleString()}</td>
        <td>{order.price}</td>
        <td>{order.orderTokenAmount}</td>
        <td>{order.baseTokenAmount}</td>
      </tr>
    ));
  };

  return (
    <div className="DEX">
      <FieldSet legend={`${marketPair}`}>
        <div style={gridStyle}>
          <p>
            Last Price: {lastPrice} {baseToken}
          </p>
          <p>
            Bid: {highestBid} {baseToken}
          </p>
          <p>
            Ask: {lowestAsk} {baseToken}
          </p>
          <p>
            1yr Volume: {baseTokenVolume} {baseToken}
          </p>
          <p>
            1yr Volume: {orderTokenVolume} {orderToken}
          </p>
        </div>
        <div style={gridStyleOrderbook}>
          {/* Left Column */}
          <div>
            <p>Asks</p>
            <table>
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Order Token Amount</th>
                  <th>Base Token Amount</th>
                </tr>
              </thead>
              <tbody>{renderTableRows(orderBookAsks)}</tbody>
            </table>

            <p>Bids</p>
            <table>
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Order Token Amount</th>
                  <th>Base Token Amount</th>
                </tr>
              </thead>
              <tbody>{renderTableRows(orderBookBids)}</tbody>
            </table>
          </div>

          {/* Right Column */}
          <div>
            <p>Executed Orders</p>
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Price</th>
                  <th>Order Token Amount</th>
                  <th>Base Token Amount</th>
                </tr>
              </thead>
              <tbody>{renderExecutedOrders()}</tbody>
            </table>
          </div>
        </div>
      </FieldSet>
    </div>
  );
}
