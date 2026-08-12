import { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { useSelector, useDispatch } from 'react-redux';
import {
  Panel,
  HorizontalTab,
  TextField,
  apiCall,
} from 'nexus-module';

import Overview from './overview';
import Trade from './trade';
import Chart from './chart';
import MarketDepth from './marketDepth';
import Markets from './markets';
import Portfolio from './portfolio';
import StablecoinSwap from './stablecoinSwap';
import NFTMarketplace from './nftMarketplace';

import { switchTab, setMarketPair } from 'actions/actionCreators';
import RefreshButton from './RefreshButton';
import { fetchMarketData } from 'actions/fetchMarketData';
import { refreshMarket } from 'actions/fetchTokenAttributes';
import ErrorBoundary from './components/ErrorBoundary';

const TokenTextField = styled(TextField)({
  maxWidth: 200,
  '& input': {
    fontWeight: 600,
  },
  '& input::placeholder': {
    color: '#555',
    opacity: 1,
    fontWeight: 400,
    fontStyle: 'italic',
  },
});

const ButtonContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 10px; /* Adjust the gap as needed */
`;

export const DEFAULT_MARKET_PAIR = 'DIST/NXS';
export const DEFAULT_BASE_TOKEN = 'DIST';
export const DEFAULT_QUOTE_TOKEN = 'NXS';

export default function Main() {
  const dispatch = useDispatch();
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair) || DEFAULT_MARKET_PAIR;
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const activeTab = useSelector((state) => state.ui.activeTab);
  const timeSpan = useSelector((state) => state.settings.timeSpan);
  //const marketPairData = useSelector((state) => state.ui.market.marketPairs);

  const [inputPair, setInputPair] = useState({
    baseTokenInput: baseToken,
    quoteTokenInput: quoteToken,
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
      if (baseToken && quoteToken && baseToken !== '' && quoteToken !== '') {
        dispatch(refreshMarket(baseToken, quoteToken));
      }
    };
    
    // Fetch data immediately
    fetchData();
  
    // Set interval to fetch data every 15 seconds
    const intervalId = setInterval(fetchData, 15000);
  
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [dispatch, marketPair, timeSpan]);

  const handleSwitchTab = (tab) => {
    dispatch(switchTab(tab));
  };

  return (
    <ErrorBoundary>
      <Panel 
        controls={
          <div className=\"controls-container\">
            <ButtonContainer>
              <TokenTextField
                label=\"Base Token\"
                name=\"baseTokenInput\"
                value={inputPair.baseTokenInput}
                onChange={handleTokenInputChange}
                placeholder={baseToken}
              />\n              /\n              <TokenTextField\n                label=\"Quote Token\"\n                name=\"quoteTokenInput\"\n                value={inputPair.quoteTokenInput}\n                onChange={handleTokenInputChange}\n                placeholder={quoteToken}\n              />\n              <RefreshButton\n                baseTokenField={inputPair.baseTokenInput}\n                quoteTokenField={inputPair.quoteTokenInput}\n              />\n            </ButtonContainer>\n          </div>\n        }\n        title={\n          <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>\n            <img src=\"distordia-logo.svg\" alt=\"\" style={{ width: '28px', height: '28px' }} />\n            <span style={{ \n              background: 'linear-gradient(135deg, #ef4568 0%, #f0aa21 100%)',\n              WebkitBackgroundClip: 'text',\n              WebkitTextFillColor: 'transparent',\n              backgroundClip: 'text',\n              fontWeight: 700,\n              fontSize: '1.1em',\n              letterSpacing: '0.5px',\n              textShadow: '0 0 20px rgba(240, 170, 33, 0.3)'\n            }}>Distordia DEX Module</span>\n          </span>\n        }\n      >\n        <div className=\"text-center\">\n          <HorizontalTab.TabBar>\n            <HorizontalTab\n              active={activeTab === 'Overview'}\n              onClick={() => handleSwitchTab('Overview')}\n            >\n              Token Overview\n            </HorizontalTab>\n            <HorizontalTab\n              active={activeTab === 'Trade'}\n              onClick={() => handleSwitchTab('Trade')}\n            >\n              Trading Desk\n            </HorizontalTab>\n            <HorizontalTab\n              active={activeTab === 'Chart'}\n              onClick={() => handleSwitchTab('Chart')}\n            >\n              History & Chart\n            </HorizontalTab>\n            <HorizontalTab\n              active={activeTab === 'MarketDepth'}\n              onClick={() => handleSwitchTab('MarketDepth')}\n            >\n              Market Depth\n            </HorizontalTab>\n            <HorizontalTab\n              active={activeTab === 'Markets'}\n              onClick={() => handleSwitchTab('Markets')}\n            >\n              Markets\n            </HorizontalTab>\n            <HorizontalTab\n              active={activeTab === 'Portfolio'}\n              onClick={() => handleSwitchTab('Portfolio')}\n            >\n              Portfolio\n            </HorizontalTab>\n            <HorizontalTab\n              active={activeTab === 'NFTArt'}\n              onClick={() => handleSwitchTab('NFTArt')}\n            >\n              NFT Art\n            </HorizontalTab>\n            {/* Stablecoin Swap tab hidden until ready for release\n          <HorizontalTab\n            active={activeTab === 'StablecoinSwap'}\n            onClick={() => handleSwitchTab('StablecoinSwap')}\n          >\n            Stablecoin Swap\n          </HorizontalTab>\n          */}\n        </HorizontalTab.TabBar>\n      </div>\n\n      <div>{activeTab === 'Overview' && <Overview />}</div>\n      <div>{activeTab === 'Trade' && <Trade />}</div>\n      <div>{activeTab === 'Chart' && <Chart />}</div>\n      <div>{activeTab === 'MarketDepth' && <MarketDepth />}</div>\n      <div>{activeTab === 'Markets' && <Markets />}</div>\n      <div>{activeTab === 'Portfolio' && <Portfolio />}</div>\n      <div>{activeTab === 'NFTArt' && <NFTMarketplace />}</div>\n      {/* Stablecoin Swap component hidden until ready for release\n      <div>{activeTab === 'StablecoinSwap' && <StablecoinSwap />}</div>\n      */}\n    </Panel>\n    </ErrorBoundary>
  );
}