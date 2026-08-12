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
    <Panel 
      controls={
        <div className="controls-container">
          <ButtonContainer>
            <TokenTextField
              label="Base Token"
              name="baseTokenInput"
              value={inputPair.baseTokenInput}
              onChange={handleTokenInputChange}
              placeholder={baseToken}
            />
            /
            <TokenTextField
              label="Quote Token"
              name="quoteTokenInput"
              value={inputPair.quoteTokenInput}
              onChange={handleTokenInputChange}
              placeholder={quoteToken}
            />
            <RefreshButton
              baseTokenField={inputPair.baseTokenInput}
              quoteTokenField={inputPair.quoteTokenInput}
            />
          </ButtonContainer>
        </div>
      }
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img src="distordia-logo.svg" alt="" style={{ width: '28px', height: '28px' }} />
          <span style={{ 
            background: 'linear-gradient(135deg, #ef4568 0%, #f0aa21 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
            fontSize: '1.1em',
            letterSpacing: '0.5px',
            textShadow: '0 0 20px rgba(240, 170, 33, 0.3)'
          }}>Distordia DEX Module</span>
        </span>
      }>
      <div className="text-center">
        <HorizontalTab.TabBar>
          <HorizontalTab
            active={activeTab === 'Overview'}
            onClick={() => handleSwitchTab('Overview')}
          >
            Token Overview
          </HorizontalTab>
          <HorizontalTab
            active={activeTab === 'Trade'}
            onClick={() => handleSwitchTab('Trade')}
          >
            Trading Desk
          </HorizontalTab>
          <HorizontalTab
            active={activeTab === 'Chart'}
            onClick={() => handleSwitchTab('Chart')}
          >
            History & Chart
          </HorizontalTab>
          <HorizontalTab
            active={activeTab === 'MarketDepth'}
            onClick={() => handleSwitchTab('MarketDepth')}
          >
            Market Depth
          </HorizontalTab>
          <HorizontalTab
            active={activeTab === 'Markets'}
            onClick={() => handleSwitchTab('Markets')}
          >
            Markets
          </HorizontalTab>
          <HorizontalTab
            active={activeTab === 'Portfolio'}
            onClick={() => handleSwitchTab('Portfolio')}
          >
            Portfolio
          </HorizontalTab>
          <HorizontalTab
            active={activeTab === 'NFTArt'}
            onClick={() => handleSwitchTab('NFTArt')}
          >
            NFT Art
          </HorizontalTab>
          {/* Stablecoin Swap tab hidden until ready for release
          <HorizontalTab
            active={activeTab === 'StablecoinSwap'}
            onClick={() => handleSwitchTab('StablecoinSwap')}
          >
            Stablecoin Swap
          </HorizontalTab>
          */}
        </HorizontalTab.TabBar>
      </div>

      <div>{activeTab === 'Overview' && <Overview />}</div>
      <div>{activeTab === 'Trade' && <Trade />}</div>
      <div>{activeTab === 'Chart' && <Chart />}</div>
      <div>{activeTab === 'MarketDepth' && <MarketDepth />}</div>
      <div>{activeTab === 'Markets' && <Markets />}</div>
      <div>{activeTab === 'Portfolio' && <Portfolio />}</div>
      <div>{activeTab === 'NFTArt' && <NFTMarketplace />}</div>
      {/* Stablecoin Swap component hidden until ready for release
      <div>{activeTab === 'StablecoinSwap' && <StablecoinSwap />}</div>
      */}
    </Panel>
  );
}
