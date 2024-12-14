import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import {
  Panel,
  HorizontalTab,
  TextField,
} from 'nexus-module';

import Overview from './overview';
import Trade from './trade';
import Chart from './chart';
import MarketDepth from './marketDepth';

import { switchTab } from 'actions/actionCreators';
import RefreshButton from './RefreshButton';
import { fetchMarketData } from 'actions/fetchMarketData';

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
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair) || DEFAULT_MARKET_PAIR;
  const orderToken = useSelector((state) => state.ui.market.marketPairs.orderToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const activeTab = useSelector((state) => state.ui.activeTab);

  const [inputPair, setInputPair] = useState({
    orderTokenInput: orderToken,
    baseTokenInput: baseToken,
  });

  function handleTokenInputChange(e) {
    const { name, value } = e.target;
    setInputPair({
      ...inputPair,
      [name]: value,
    });
  }

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
  }, [dispatch, marketPair]);

  const handleSwitchTab = (tab) => {
    dispatch(switchTab(tab));
  };

  return (
    <Panel 
      controls={<RefreshButton orderTokenField={inputPair.orderTokenInput} baseTokenField={inputPair.baseTokenInput} />}
      title={"Distordia DEX Module"} 
      icon={{ url: 'react.svg', id: 'icon' }}>
      <div className="text-center">
        <ButtonContainer>
          <DemoTextField
            label="Order Token"
            name="orderTokenInput"
            value={inputPair.orderTokenInput}
            onChange={handleTokenInputChange}
            placeholder={orderToken}
          />
          /
          <DemoTextField
            label="Base Token"
            name="baseTokenInput"
            value={inputPair.baseTokenInput}
            onChange={handleTokenInputChange}
            placeholder={baseToken}
          />
        </ButtonContainer>
      </div>
      <div className="text-center">
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
      </div>

      <div>{activeTab === 'Overview' && <Overview />}</div>
      <div>{activeTab === 'Trade' && <Trade />}</div>
      <div>{activeTab === 'Chart' && <Chart />}</div>
      <div>{activeTab === 'MarketDepth' && <MarketDepth />}</div>
    </Panel>
  );
}
