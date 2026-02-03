import { useState, useEffect, useMemo } from 'react';
import { 
  PageLayout, 
  TopRow, 
  BottomRow,
  TradeBottomRow, 
} from 'components/styles';
import { useDispatch } from 'react-redux';
import { setMarketPair, switchTab } from 'actions/actionCreators';

import { apiCall, FieldSet } from 'nexus-module';

import { formatTokenName } from 'components/styles';
import { formatNumberWithLeadingZeros } from 'actions/formatNumber';
import { cachedApiCall } from 'utils/apiCache';

const PORTFOLIO_CACHE_TTL = 15000; // 15 seconds cache for portfolio data

export default function Portfolio() {
  //const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const [tokenList, setTokenList] = useState([]);
  const [hideZeroBalances, setHideZeroBalances] = useState(false);
  const dispatch = useDispatch();

  // Fetch tokens and their NXS value
  const fetchTokens = async () => {
    try {
      const accounts = await apiCall('finance/list/account/ticker,token,balance');
      if (!Array.isArray(accounts)) {
        setTokenList([]);
        return;
      }

      // Check if each ticker is a global ticker
      const accountsWithGlobalCheck = await Promise.all(accounts.map(async acc => {
        if (!acc.ticker || acc.ticker === '') return { ...acc, ticker: '' };
        if (acc.ticker !== 'NXS') {
          const res = await apiCall('register/get/finance:token', { name: acc.ticker }).catch(() => null);
          if (res && res.address) {
            return acc;
          } else {
            return { ...acc, ticker: '' };
          }
        }
        return acc;
      }));

      // Sum balances by token
      const tokenMap = {};
      for (const acc of accountsWithGlobalCheck) {
        const key = acc.token;
        if (!tokenMap[key]) {
          tokenMap[key] = { ...acc, balance: parseFloat(acc.balance) };
        } else {
          tokenMap[key].balance += parseFloat(acc.balance);
        }
      }
      // Fetch last NXS price for each token and calculate 24h change and P&L
      const tokens = await Promise.all(Object.values(tokenMap).map(async (token) => {
        let nxsValue = 0;
        let lastPrice = 0;
        let change24h = null;
        let totalPnL = null;
        let costBasis = null;
        
        if (token.ticker !== 'NXS') {
          try {
            const market = `${token.ticker}/NXS`;
            const executed = await cachedApiCall(apiCall, 'market/list/executed', { market, sort: 'timestamp', order: 'desc', limit: 5 }, PORTFOLIO_CACHE_TTL);
            let latest = null;
            let latestType = null;
            if (executed && typeof executed === 'object') {
              const bids = Array.isArray(executed.bids) ? executed.bids : [];
              const asks = Array.isArray(executed.asks) ? executed.asks : [];
              const all = [
                ...bids.map(e => ({ ...e, _type: 'bid' })),
                ...asks.map(e => ({ ...e, _type: 'ask' }))
              ];
              if (all.length > 0) {
                all.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
                latest = all[0];
                latestType = latest._type;
              }
            }
            if (latest && latestType === 'bid') {
              lastPrice = (parseFloat(latest.contract.amount) / parseFloat(latest.order.amount)) / 1e6;
            } else if (latest && latestType === 'ask') {
              lastPrice = (parseFloat(latest.order.amount) / parseFloat(latest.contract.amount)) / 1e6;
            }
            if (lastPrice > 0) {
              nxsValue = token.balance * lastPrice;
            }
            
            // Fetch user's executed trades for this token to calculate P&L
            try {
              const userTrades = await cachedApiCall(apiCall, 'market/user/executed', { 
                token: token.ticker,
                limit: 500  // Reduced from 1000 for better performance
              }, PORTFOLIO_CACHE_TTL);
              
              if (userTrades && typeof userTrades === 'object') {
                const userExecuted = Array.isArray(userTrades.executed) ? userTrades.executed : 
                                     Array.isArray(userTrades) ? userTrades : [];
                
                // Calculate total cost basis from buy trades and revenue from sell trades
                // NOTE: market/user/executed returns market as NXS/<token>
                // So bid = buying NXS with <token> = SELLING token
                //    ask = selling NXS for <token> = BUYING token
                let totalNxsSpent = 0;  // NXS spent buying this token
                let totalNxsReceived = 0;  // NXS received selling this token
                let totalTokensBought = 0;
                let totalTokensSold = 0;
                
                for (const trade of userExecuted) {
                  if (!trade.contract || !trade.order) continue;
                  
                  const tradeType = trade.type;
                  let tokenAmount = 0;
                  let nxsAmount = 0;
                  
                  // For bid orders on NXS/<token>: user is buying NXS with <token>
                  // This means user is SELLING the token and RECEIVING NXS
                  // contract = <token> being spent, order = NXS being received
                  if (tradeType === 'bid') {
                    tokenAmount = parseFloat(trade.contract.amount);
                    nxsAmount = parseFloat(trade.order.amount);
                    // Convert NXS from divisible units
                    if (trade.order.ticker === 'NXS') {
                      nxsAmount = nxsAmount / 1e6;
                    }
                    totalNxsReceived += nxsAmount;
                    totalTokensSold += tokenAmount;
                  }
                  // For ask orders on NXS/<token>: user is selling NXS for <token>
                  // This means user is BUYING the token and SPENDING NXS
                  // contract = NXS being spent, order = <token> being received
                  else if (tradeType === 'ask') {
                    nxsAmount = parseFloat(trade.contract.amount);
                    tokenAmount = parseFloat(trade.order.amount);
                    // Convert NXS from divisible units
                    if (trade.contract.ticker === 'NXS') {
                      nxsAmount = nxsAmount / 1e6;
                    }
                    totalNxsSpent += nxsAmount;
                    totalTokensBought += tokenAmount;
                  }
                }
                
                // Net tokens acquired through trading
                const netTokensFromTrading = totalTokensBought - totalTokensSold;
                // Net NXS cost (spent - received)
                const netNxsCost = totalNxsSpent - totalNxsReceived;
                
                // Only calculate P&L if user has traded this token
                if (totalTokensBought > 0 || totalTokensSold > 0) {
                  costBasis = netNxsCost;
                  // P&L = Current Value - Cost Basis
                  // If user has sold more than bought (net negative tokens), 
                  // we need to account for current holdings value
                  totalPnL = nxsValue - costBasis;
                }
              }
            } catch (e) {
              // User trades fetch failed, P&L will be null
            }
            
            // Fetch price 24h ago
            const now = Math.floor(Date.now() / 1000);
            const dayAgo = now - 24 * 60 * 60;
            const executed24h = await cachedApiCall(apiCall, 'market/list/executed', {
              market,
              sort: 'timestamp',
              order: 'desc',
              limit: 20,  // Reduced from 50 for better performance
              where: `results.timestamp<${dayAgo}`
            }, PORTFOLIO_CACHE_TTL).catch(() => ({}));
            let price24h = null;
            if (executed24h && typeof executed24h === 'object') {
              const bids24 = Array.isArray(executed24h.bids) ? executed24h.bids : [];
              const asks24 = Array.isArray(executed24h.asks) ? executed24h.asks : [];
              const all24 = [
                ...bids24.map(e => ({ ...e, _type: 'bid' })),
                ...asks24.map(e => ({ ...e, _type: 'ask' }))
              ];
              if (all24.length > 0) {
                all24.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
                const latest24 = all24[0];
                if (latest24 && latest24._type === 'bid') {
                  price24h = (parseFloat(latest24.contract.amount) / parseFloat(latest24.order.amount)) / 1e6;
                } else if (latest24 && latest24._type === 'ask') {
                  price24h = (parseFloat(latest24.order.amount) / parseFloat(latest24.contract.amount)) / 1e6;
                }
              }
            }
            if (lastPrice && price24h) {
              change24h = ((lastPrice - price24h) / price24h) * 100;
            }
          } catch (e) {
            nxsValue = 0;
          }
        } else {
          const trustBalance = await apiCall('finance/list/trust/balance/sum');
          const trustStake = await apiCall('finance/list/trust/stake/sum');
          nxsValue = token.balance + trustBalance.balance + trustStake.stake;
          lastPrice = 1;
          change24h = null;
          token.balance = token.balance + trustBalance.balance + trustStake.stake;
        }
        return { ...token, nxsValue, lastPrice, change24h, totalPnL, costBasis };
      }));
      setTokenList(tokens);
    } catch (error) {
      setTokenList([]);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleTokenClick = async (token) => {
    
    if (token.ticker === 'NXS' || token.ticker === '') {
      return;
    } else {

      const tokenData = await apiCall(
        'register/get/finance:token/token,ticker,maxsupply,currentsupply,decimals',
        {
          address: token.address,
        }
      ).catch(() => ({
        ticker: '', address: token.address, maxsupply: 0, currentsupply: 0, decimals: 0
      }));
    
      dispatch(setMarketPair(
        (token.ticker !== '' && token.ticker !== 'NXS') 
          ? token.ticker + '/NXS'
          : token.address + '/NXS',
        token.ticker,
        'NXS',
        tokenData.maxsupply,
        0,
        tokenData.currentsupply,
        0,
        tokenData.decimals,
        6,
        token.address,
        '0'
      ));
      dispatch(switchTab('Overview'));
    }
  };

  // Calculate total NXS value
  const totalNxsValue = tokenList.reduce((sum, token) => sum + (token.nxsValue || 0), 0);

  // Filter tokens based on hideZeroBalances checkbox
  const filteredTokenList = hideZeroBalances 
    ? tokenList.filter(token => token.balance > 0)  
    : tokenList;

  return (
    <PageLayout>
      <TopRow>
        <FieldSet legend="My Holdings">
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input 
              type="checkbox" 
              id="hideZeroBalances"
              checked={hideZeroBalances}
              onChange={(e) => setHideZeroBalances(e.target.checked)}
              style={{ 
                accentColor: '#00e6d8',
                transform: 'scale(1.2)',
              }}
            />
            <label 
              htmlFor="hideZeroBalances" 
              style={{ 
                color: '#e0e0e0', 
                fontSize: '0.95rem', 
                cursor: 'pointer',
                userSelect: 'none'
              }}
            >
              Hide zero balances
            </label>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181c24', color: '#e0e0e0', borderRadius: '8px', overflow: 'hidden', fontSize: '1rem' }}>
            <thead>
              <tr style={{ background: '#232837', color: '#fff' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Token</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Last Price [NXS]</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>24h Change</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Value [NXS]</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total P&L [NXS]</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...filteredTokenList.filter(token => token.ticker === 'NXS'),
                ...filteredTokenList
                  .filter(token => token.ticker !== 'NXS')
                  .sort((a, b) => (b.nxsValue || 0) - (a.nxsValue || 0))
              ].map((token, idx) => (
                <tr
                  key={idx}
                  style={{ borderBottom: '1px solid #232837', cursor: 'pointer' }}
                  onClick={() => handleTokenClick(token)}
                >
                  <td style={
                    token.ticker === 'NXS'
                      ? {
                          padding: '8px 8px',
                          fontWeight: 900,
                          background: 'linear-gradient(90deg, #ffe066 0%, #ffd700 100%)',
                          color: '#232837',
                          borderRadius: '8px',
                          letterSpacing: '0.06em',
                          fontSize: '1.12em',
                          boxShadow: '0 2px 8px 0 #ffd70055',
                          border: '2px solid #ffd700',
                          maxWidth: 140,
                          textAlign: 'center',
                          textShadow: '0 0 6px #fffbe6, 0 0 2px #ffd700',
                        }
                      : {
                          padding: '8px 8px',
                          fontWeight: 700,
                          background: 'linear-gradient(90deg, #00e6d8 0%, #0077ff 100%)',
                          color: '#181c24',
                          borderRadius: '6px',
                          letterSpacing: '0.04em',
                          fontSize: '1.08em',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                          border: '1px solid #00e6d8',
                          maxWidth: 120,
                          textAlign: 'center',
                        }
                  }>
                    {formatTokenName(token.ticker || token.token)}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                    {token.ticker === 'NXS' ? '-' : (typeof token.lastPrice === 'number' && !isNaN(token.lastPrice) ? token.lastPrice.toFixed(6) : '-')}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', color: typeof token.change24h === 'number' && !isNaN(token.change24h)
                    ? (token.change24h > 0 ? '#00e676' : token.change24h < 0 ? '#ff5252' : '#e0e0e0')
                    : '#e0e0e0', fontWeight: 400 }}>
                    {typeof token.change24h === 'number' && !isNaN(token.change24h)
                      ? `${token.change24h > 0 ? '+' : ''}${token.change24h.toFixed(2)}%`
                      : '-'}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>{typeof token.balance === 'number' ? formatNumberWithLeadingZeros(token.balance, 3, 6) : token.balance}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{typeof token.nxsValue === 'number' && !isNaN(token.nxsValue) ? token.nxsValue.toFixed(6) : '-'}</td>
                  <td style={{ 
                    padding: '8px 8px', 
                    textAlign: 'right', 
                    fontWeight: 600,
                    color: typeof token.totalPnL === 'number' && !isNaN(token.totalPnL)
                      ? (token.totalPnL > 0 ? '#00e676' : token.totalPnL < 0 ? '#ff5252' : '#e0e0e0')
                      : '#e0e0e0'
                  }}>
                    {typeof token.totalPnL === 'number' && !isNaN(token.totalPnL)
                      ? `${token.totalPnL >= 0 ? '+' : ''}${token.totalPnL.toFixed(4)}`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </FieldSet>
      </TopRow>
      <div style={{
        marginTop: '18px',
        background: '#232837',
        color: '#fff',
        borderRadius: '8px',
        padding: '18px 24px',
        fontSize: '1.25rem',
        fontWeight: 700,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        textAlign: 'center',
        minWidth: 500,
        maxWidth: 700,
        maxHeight: 100,
        overflowY: 'auto',
        marginLeft: 'auto',
        marginRight: 'auto',
      }}>
        Total Portfolio Value: <span style={{ color: '#00e6d8' }}>{totalNxsValue.toFixed(6)} NXS</span>
      </div>
    </PageLayout>
  );
}