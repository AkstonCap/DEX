import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { fetchVolumeData } from 'actions/fetchVolumeData';

export default function Overview() {
  const dispatch = useDispatch();

  const marketPair = useSelector((state) => state.ui.market.marketPair);
  const baseToken = useSelector((state) => state.ui.market.baseToken);
  const orderToken = useSelector((state) => state.ui.market.orderToken);

  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const executedOrders = useSelector((state) => state.ui.market.executedOrders);

  // Declare state variables
  const [baseTokenVolume, setBaseTokenVolume] = useState(null);
  const [orderTokenVolume, setOrderTokenVolume] = useState(null);
  const [lastPrice, setLastPrice] = useState(null);
  const [highestBid, setHighestBid] = useState(null);
  const [lowestAsk, setLowestAsk] = useState(null);

  useEffect(() => {
    const updateData = () => {
      if (executedOrders && ( executedOrders.bids.length > 0 || executedOrders.asks.length > 0 ) ) {
        const volumeData = fetchVolumeData(orderToken, baseToken, executedOrders);
        setBaseTokenVolume(volumeData.baseTokenVolume);
        setOrderTokenVolume(volumeData.orderTokenVolume);
        const sortedExecutedOrders = [...executedOrders.bids, ...executedOrders.asks].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setLastPrice(sortedExecutedOrders[0]?.price || null);
      }

      setHighestBid(orderBook.bids[0]?.price || null);
      setLowestAsk(orderBook.asks[0]?.price || null);
    };

    updateData();

    // Set interval to update data every 60 seconds
    const intervalId = setInterval(updateData, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Update data when market pair changes and when new executed orders and order book are fetched
    updateData();
  }, [marketPair, executedOrders, orderBook]);

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
        <td>{item.order.amount}</td>
        <td>{item.contract.amount}</td>
      </tr>
    ));
  };

  const renderExecutedOrders = () => {
    if (!Array.isArray(executedOrders) || (executedOrders.bids.length === 0 && executedOrders.asks.length === 0)) {
      return (
        <tr>
          <td colSpan="4">No executed orders</td>
        </tr>
      );
    }

    const sortedExecutedOrders = [...executedOrders.bids, ...executedOrders.asks].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return sortedExecutedOrders.map((order, index) => (
      <tr key={index}>
        <td>{new Date(order.timestamp).toLocaleString()}</td>
        <td>{order.price}</td>
        <td>{order.order.amount}</td>
        <td>{order.contract.amount}</td>
      </tr>
    ));
  };

  return (
    <div className="DEX">
      <FieldSet legend={`${marketPair}`}>
        <div style={gridStyle}>
          <p>
            Last Price: {lastPrice !== null ? `${lastPrice} ${baseToken}` : 'N/A'}
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
              <tbody>{renderTableRows(orderBook.asks)}</tbody>
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
              <tbody>{renderTableRows(orderBook.bids)}</tbody>
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
