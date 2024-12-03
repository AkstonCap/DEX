import { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import {
  Panel,
  Switch,
  Tooltip,
  TextField,
  Button,
  FieldSet,
  confirm,
  apiCall,
  showErrorDialog,
  showSuccessDialog,
} from 'nexus-module';

import { 
  setMarketPair, 
  setBaseToken, 
  setOrderToken
 } from 'actions/actionCreators';
import RefreshButton from './RefreshButton';
import { viewMarket } from 'actions/viewMarket';
import { fetchLastPrice } from 'actions/fetchLastPrice';
import { fetchHighestBid, fetchLowestAsk } from 'actions/fetchFirstOrders';
import { fetchVolume } from 'actions/fetchVolume';
import { fetchOrderBook } from 'actions/fetchOrderBook';
import { fetchExecuted } from 'actions/fetchExecuted';

const DemoTextField = styled(TextField)({
  maxWidth: 200,
});

const ButtonContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px; /* Adjust the gap as needed */
`;

const DEFAULT_MARKET_PAIR = 'DIST/NXS';
const DEFAULT_ORDER_TOKEN = 'DIST';
const DEFAULT_BASE_TOKEN = 'NXS';

export default function Main() {
  const dispatch = useDispatch();
  const marketPair = useSelector((state) => state.market.marketPair) || DEFAULT_MARKET_PAIR;
  const orderToken = useSelector((state) => state.market.orderToken);
  const baseToken = useSelector((state) => state.market.baseToken);
  
  /*
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
  if (name === 'orderTokenField') {
    dispatch(updateInputOrderToken(value));
  } else if (name === 'baseTokenField') {
    dispatch(updateInputBaseToken(value));
  }
  }, [dispatch]);
  */

  const [orderTokenField, setOrderTokenField] = useState(orderToken || DEFAULT_ORDER_TOKEN);
  const [baseTokenField, setBaseTokenField] = useState(baseToken || DEFAULT_BASE_TOKEN);
  const [lastPrice, setLastPrice] = useState('N/A');
  const [highestBid, setHighestBid] = useState('N/A');
  const [lowestAsk, setLowestAsk] = useState('N/A');
  //const [baseToken, setBaseToken] = useState(DEFAULT_BASE_TOKEN);
  //const [orderToken, setOrderToken] = useState(DEFAULT_ORDER_TOKEN);
  const [orderTokenVolume, setOrderTokenVolume] = useState('N/A');
  const [baseTokenVolume, setBaseTokenVolume] = useState('N/A');
  const [checkingMarket, setCheckingMarket] = useState(false);
  //const [marketPair, setMarketPair] = useState(DEFAULT_MARKET_PAIR);
  const [orderBook, setOrderBook] = useState([]);
  const [orderBookBids, setOrderBookBids] = useState([]);
  const [orderBookAsks, setOrderBookAsks] = useState([]);
  const [executedBids, setExecutedBids] = useState([]);
  const [executedAsks, setExecutedAsks] = useState([]);
  const [executedOrders, setExecutedOrders] = useState([]);

  const handleRefresh = () => {
    const newOrderToken = orderTokenField || DEFAULT_ORDER_TOKEN;
    const newBaseToken = baseTokenField || DEFAULT_BASE_TOKEN;
  
    dispatch(setOrderToken(newOrderToken));
    dispatch(setBaseToken(newBaseToken));
    
    const newMarketPair = `${newOrderToken}/${newBaseToken}`;
    dispatch(setMarketPair(newMarketPair));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchLastPrice(marketPair, checkingMarket, 
          setCheckingMarket, setLastPrice, showErrorDialog, orderToken, baseToken);
        await fetchHighestBid(marketPair, setHighestBid, showErrorDialog, orderToken, baseToken);
        await fetchLowestAsk(marketPair, setLowestAsk, showErrorDialog, orderToken, baseToken);
        await fetchVolume(marketPair, checkingMarket, setCheckingMarket, 
          setOrderTokenVolume, setBaseTokenVolume, showErrorDialog, '1y');
        await fetchOrderBook(marketPair, checkingMarket, setCheckingMarket, 
          setOrderBook, setOrderBookBids, setOrderBookAsks, showErrorDialog);
        await fetchExecuted(marketPair, checkingMarket, setCheckingMarket, 
          setExecutedOrders, setExecutedBids, setExecutedAsks, showErrorDialog, '1y');
      } catch (error) {
        showErrorDialog({
          message: 'Cannot fetch data',
          note: error?.message || 'Unknown error',
        });
      }
    };

    fetchData();
  }, [marketPair]);

  useEffect(() => {
    setOrderTokenField(orderToken);
  }, [orderToken]);

  useEffect(() => {
    setBaseTokenField(baseToken);
  }, [baseToken]);

  const renderTableRows = (data) => {
    return data.slice(0, 5).map((item, index) => (
      <tr key={index}>
        <td>{(item.order.amount / item.contract.amount)}</td>
        <td>{item.order.amount}</td>
        <td>{item.contract.amount}</td>
      </tr>
    ));
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(2, auto)',
    gap: '10px' // Adjust the gap as needed
  };

  const gridStyleOrderbook = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gridTemplateRows: 'repeat(2, auto)',
    gap: '10px' // Adjust the gap as needed
  };

  function renderExecutedOrders() {
    const combinedOrders = [...executedBids, ...executedAsks];
  
    combinedOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
    return combinedOrders.map((order, index) => (
      <tr key={index} style={{ color: order.type === 'bid' ? 'green' : 'red' }}>
        <td>{order.timestamp}</td>
        <td>{order.price}</td>
        <td>{order.orderTokenAmount}</td>
        <td>{order.baseTokenAmount}</td>
      </tr>
    ));
  }

  return (
    <Panel title={"DEX Module"} icon={{ url: 'react.svg', id: 'icon' }}>
      <div className="text-center">
        <ButtonContainer>
          <DemoTextField
            label="Order Token"
            value={orderTokenField}
            onChange={(e) => setOrderTokenField(e.target.value)}
          />
          /
          <DemoTextField
            label="Base Token"
            value={baseTokenField}
            onChange={(e) => setBaseTokenField(e.target.value)}
          />
          <RefreshButton onClick={
            handleRefresh
            } />
        </ButtonContainer>
      </div>

      <div className="DEX">
        <FieldSet legend={`${marketPair}`}>
          <p>
            <Button onClick={() => viewMarket(
              marketPair, 'executed', 10, 'time', '1y', setCheckingMarket
              )} disabled={checkingMarket}>
              View {marketPair} transactions
            </Button>{' '}
            
            <Button onClick={() => viewMarket(
              marketPair, 'order', 10, 'time', '1y', setCheckingMarket
              )} disabled={checkingMarket}>
              View {marketPair} orders
            </Button>{' '}
          </p>
          <div style={gridStyle}>
            <p>Last Price: {lastPrice} {baseToken}</p>
            
            <p>Bid: {highestBid} {baseToken}</p>
            
            <p>Ask: {lowestAsk} {baseToken}</p>
            
            <p>1yr Volume: {baseTokenVolume} {baseToken}</p>
           
            <p>1yr Volume: {orderTokenVolume} {orderToken}</p>
           
          </div>
          <div style={gridStyleOrderbook}>
            {/* Left Column */}
            <div>
              {/* Asks Table */}
              <p>Asks</p>
              <table>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Order Token Amount</th>
                    <th>Base Token Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows(orderBookAsks)}
                </tbody>
              </table>

              {/* Bids Table */}
              <p>Bids</p>
              <table>
                <thead>
                  <tr>
                    <th>Price</th>
                    <th>Order Token Amount</th>
                    <th>Base Token Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {renderTableRows(orderBookBids)}
                </tbody>
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
                <tbody>
                  {renderExecutedOrders()}
                </tbody>
              </table>
            </div>
          </div>
        </FieldSet>
      </div>
    </Panel>
  );
}
