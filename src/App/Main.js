import { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import {
  Panel,
  HorizontalTab,
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

import Overview from './overview';
import Trade from './trade';
import Chart from './chart';
import MarketDepth from './marketDepth';

import { 
  setMarketPair, 
  setBaseToken, 
  setOrderToken,
  switchTab,
 } from 'actions/actionCreators';

import RefreshButton from './RefreshButton';

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

export const DEFAULT_MARKET_PAIR = 'DIST/NXS';
export const DEFAULT_ORDER_TOKEN = 'DIST';
export const DEFAULT_BASE_TOKEN = 'NXS';

export default function Main() {
  const dispatch = useDispatch();
  const marketPair = useSelector((state) => state.ui.market.marketPair) || DEFAULT_MARKET_PAIR;
  const orderToken = useSelector((state) => state.ui.market.orderToken);
  const baseToken = useSelector((state) => state.ui.market.baseToken);
  const activeTab = useSelector((state) => state.ui.activeTab);

  const [orderTokenField, setOrderTokenField] = useState(orderToken || DEFAULT_ORDER_TOKEN);
  const [baseTokenField, setBaseTokenField] = useState(baseToken || DEFAULT_BASE_TOKEN);

  useEffect(() => {
    const fetchData = () => {
      dispatch(fetchMarketData());
    };
  
    // Fetch data immediately
    fetchData();
  
    // Set interval to fetch data every 60 seconds
    const intervalId = setInterval(fetchData, 60000);
  
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [dispatch]);

  const handleSwitchTab = (tab) => {
    dispatch(switchTab(tab));
  };

  return (
    <Panel 
      controls={<RefreshButton />}
      title={"DEX Module"} 
      icon={{ url: 'react.svg', id: 'icon' }}>
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
          controls={<RefreshButton />}
        </ButtonContainer>
      </div>
      <HorizontalTab.TabBar>
        <HorizontalTab
          active={activeTab === 'Overview'}
          onClick={() => handleSwitchTab('Overview')}
        >
          Overview
        </HorizontalTab>
        <HorizontalTab
          active={activeTab === 'Trade'}
          onClick={() => handleSwitchTab('Trade')}
        >
          Trade (tba)
        </HorizontalTab>
        <HorizontalTab
          active={activeTab === 'Chart'}
          onClick={() => handleSwitchTab('Chart')}
        >
          Chart (tba)
        </HorizontalTab>
        <HorizontalTab
          active={activeTab === 'MarketDepth'}
          onClick={() => handleSwitchTab('MarketDepth')}
        >
          Market Depth (tba)
        </HorizontalTab>
      </HorizontalTab.TabBar>
      
      <div>{activeTab === 'Overview' && <Overview />}</div>
      <div>{activeTab === 'Trade' && <Trade />}</div>
      <div>{activeTab === 'Chart' && <Chart />}</div>
      <div>{activeTab === 'MarketDepth' && <MarketDepth />}</div>
    </Panel>
  );
}
