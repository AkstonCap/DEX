import { useState, useEffect } from 'react';
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

export default function Portfolio() {
  //const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const [tokenList, setTokenList] = useState([]);
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
        if (!acc.ticker) return { ...acc, ticker: '' };
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
      // Fetch last NXS price for each token
      const tokens = await Promise.all(Object.values(tokenMap).map(async (token) => {
        let nxsValue = 0;
        let lastPrice = 0;
        let decimals = 0;
        if (token.ticker !== 'NXS') {
          try {
            const market = `${token.token}/NXS`;
            const executed = await apiCall('market/list/executed', { market, sort: 'timestamp', order: 'desc', limit: 5 });
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
          } catch (e) {
            nxsValue = 0;
          }
        } else {
          const trustBalance = await apiCall('finance/list/trust/balance/sum');
          const trustStake = await apiCall('finance/list/trust/stake/sum');
          nxsValue = token.balance + trustBalance.balance + trustStake.stake;
          lastPrice = 1;
        }
        return { ...token, nxsValue, lastPrice };
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

  return (
    <PageLayout>
      <TopRow>
        <FieldSet legend="My Holdings">
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#181c24', color: '#e0e0e0', borderRadius: '8px', overflow: 'hidden', fontSize: '1rem' }}>
            <thead>
              <tr style={{ background: '#232837', color: '#fff' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left' }}>Token</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Last Price [NXS]</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Balance</th>
                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Value [NXS]</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...tokenList.filter(token => token.ticker === 'NXS'),
                ...tokenList
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
                  <td style={{ padding: '8px 8px', textAlign: 'right' }}>{typeof token.balance === 'number' ? formatNumberWithLeadingZeros(token.balance, 3, 6) : token.balance}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>{typeof token.nxsValue === 'number' && !isNaN(token.nxsValue) ? token.nxsValue.toFixed(6) : '-'}</td>
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