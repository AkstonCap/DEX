import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { FieldSet, Button } from 'nexus-module';
import { viewMarket } from 'actions/viewMarket';

export default function Overview() {
  const dispatch = useDispatch();

  const marketPair = useSelector((state) => state.market.marketPair);
  const lastPrice = useSelector((state) => state.market.lastPrice);
  const baseToken = useSelector((state) => state.market.baseToken);
  const highestBid = useSelector((state) => state.market.highestBid);
  const lowestAsk = useSelector((state) => state.market.lowestAsk);
  const baseTokenVolume = useSelector((state) => state.market.baseTokenVolume);
  const orderTokenVolume = useSelector((state) => state.market.orderTokenVolume);
  const orderToken = useSelector((state) => state.market.orderToken);
  const checkingMarket = useSelector((state) => state.market.checkingMarket);
  const orderBookAsks = useSelector((state) => state.market.orderBookAsks);
  const orderBookBids = useSelector((state) => state.market.orderBookBids);
  const executedBids = useSelector((state) => state.market.executedBids);
  const executedAsks = useSelector((state) => state.market.executedAsks);

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
    return data.slice(0, 5).map((item, index) => (
      <tr key={index}>
        <td>{item.price}</td>
        <td>{item.orderTokenAmount}</td>
        <td>{item.baseTokenAmount}</td>
      </tr>
    ));
  };

  const renderExecutedOrders = () => {
    const combinedOrders = [...executedBids, ...executedAsks];
    combinedOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return combinedOrders.map((order, index) => (
      <tr key={index}>
        <td>{order.timestamp}</td>
        <td>{order.price}</td>
        <td>{order.orderTokenAmount}</td>
        <td>{order.baseTokenAmount}</td>
      </tr>
    ));
  };

  return (
    <div className="DEX">
      <FieldSet legend={`${marketPair}`}>
        <p>
          <Button
            onClick={() => dispatch(viewMarket(marketPair, 'executed', 10, 'time', '1y'))}
            disabled={checkingMarket}
          >
            View {marketPair} transactions
          </Button>{' '}
          <Button
            onClick={() => dispatch(viewMarket(marketPair, 'order', 10, 'time', '1y'))}
            disabled={checkingMarket}
          >
            View {marketPair} orders
          </Button>
        </p>
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
