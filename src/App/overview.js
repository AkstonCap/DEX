import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { fetchVolumeData } from 'actions/fetchVolumeData';
import { fetchMarketData } from 'actions/fetchMarketData';
import styled from '@emotion/styled';

export default function Overview() {
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const orderToken = useSelector((state) => state.ui.market.marketPairs.orderToken);

  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const executedOrders = useSelector(
    (state) => state.ui.market.executedData.executedOrders
  );

  // Declare state variables
  const [baseTokenVolume, setBaseTokenVolume] = useState(0);
  const [orderTokenVolume, setOrderTokenVolume] = useState(0);
  const [lastPrice, setLastPrice] = useState('N/A');
  const [highestBid, setHighestBid] = useState('N/A');
  const [lowestAsk, setLowestAsk] = useState('N/A');

  // Define updateData function at the component level
  const updateData = () => {
    if (
      executedOrders &&
      (executedOrders.bids?.length > 0 || executedOrders.asks?.length > 0)
    ) {
      const volumeData = fetchVolumeData(executedOrders);
      setBaseTokenVolume(volumeData.baseTokenVolume);
      setOrderTokenVolume(volumeData.orderTokenVolume);

      const sortedExecutedOrders = [
        ...executedOrders.bids,
        ...executedOrders.asks,
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setLastPrice(sortedExecutedOrders[0]?.price || 'N/A');
    } else {
      setBaseTokenVolume(0);
      setOrderTokenVolume(0);
      setLastPrice('N/A');
    }

    setHighestBid(orderBook?.bids?.[0]?.price || 'N/A');
    setLowestAsk(orderBook?.asks?.[0]?.price || 'N/A');
  };

  useEffect(() => {
    fetchMarketData();

    // Set interval to update data every 60 seconds
    const intervalId = setInterval(updateData, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Update data when dependencies change
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
        <td>{`${item.order.amount} ${orderToken}`}</td>
        <td>{`${item.contract.amount} ${baseToken}`}</td>
      </tr>
    ));
  };

  const renderExecutedOrders = () => {
    const bids = executedOrders && Array.isArray(executedOrders.bids) ? executedOrders.bids : [];
    const asks = executedOrders && Array.isArray(executedOrders.asks) ? executedOrders.asks : [];

    if (bids.length === 0 && asks.length === 0) {
      return (
        <tr>
          <td colSpan="3">No executed orders</td>
        </tr>
      );
    }
    asks.forEach((element) => {
      element.order.amount = element.contract.amount;
    });

    const sortedExecutedOrders = [...bids, ...asks].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    return sortedExecutedOrders.map((order, index) => (
      <tr key={index}>
        <td>{`${order.price} ${baseToken}`}</td>
        <td>{`${order.order.amount} ${orderToken}`}</td>
        <td>{new Date(order.timestamp).toLocaleString()}</td>
      </tr>
    ));
  };

  return (
    <div className="text-center">
      <div className="mt2">
        <FieldSet legend={`${marketPair} overview`}>
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
        </FieldSet>

        <FieldSet legend="Order Book">
          <div style={gridStyleOrderbook}>
            {/* Left Column */}
            <div>
              <p>Asks</p>
              <table>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Amount</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>{renderTableRows(orderBook.asks)}</tbody>
              </table>
            </div>
            <div>
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
          </div>
        </FieldSet>
      </div>

      <div className="mt2 flex center">
        <FieldSet legend="Executed Orders">
          {/* Right Column */}
          <div>
            <table>
              <thead>
                <tr>
                  <th>Price</th>
                  <th>Amount</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>{renderExecutedOrders()}</tbody>
            </table>
          </div>
        </FieldSet>
      </div>
    </div>
  );
}
