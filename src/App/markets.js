import { 
  PageLayout, 
  OrderbookTableHeader, 
  OrderbookTableRow, 
  OrderTable,
  MarketsTable,
  TradeBottomRow,
  TickerText,
  DualColRow,
  SingleColRow,
  WideMarketsTable,
  MarketsTableHeader,
} from "components/styles";
import styled from '@emotion/styled';
import { 
  showErrorDialog,
  showSuccessDialog,
  apiCall,
  secureApiCall,
  FieldSet,
  TextField,
  Button,
} from 'nexus-module';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setMarketPair, switchTab } from "actions/actionCreators";
import RefreshButton from "./RefreshButton";
import { formatNumberWithLeadingZeros } from 'actions/formatNumber';
import { cachedApiCall } from 'utils/apiCache';

const WATCHLIST_ASSET_NAME = 'dex-watchlist';
const MARKETS_CACHE_TTL = 30000; // 30 seconds cache for market data

const SearchField = styled(TextField)({
  maxWidth: 200,
});

const StarButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  transition: transform 0.2s;
  color: #ffffff;
  text-shadow: ${({ $filled }) => $filled ? 'none' : `
    -1px -1px 0 #fff,
    1px -1px 0 #fff,
    -1px 1px 0 #fff,
    1px 1px 0 #fff`};
  &:hover {
    transform: scale(1.2);
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const WatchlistHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const CreateWatchlistButton = styled(Button)`
  padding: 8px 16px;
  font-size: 14px;
`;

const ResponsiveDualColRow = styled(DualColRow)`
  display: flex;
  flex-direction: row;
  gap: 24px;
  @media (max-width: 1300px) {
    flex-direction: column;
    gap: 32px;
    align-items: stretch;
  }
  & > * {
    min-width: 340px;
    flex: 1 1 0;
  }
`;

export default function Markets() {
  
  const dispatch = useDispatch();
  const num = 50;
  const [topVolumeMarkets, setTopVolumeMarkets] = useState([]); 
  const [topMarketCapMarkets, setTopMarketCapMarkets] = useState([]);
  const [tokenList, setTokenList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [search, setSearch] = useState('');
  
  // Watchlist state
  const [watchlist, setWatchlist] = useState([]);
  const [watchlistExists, setWatchlistExists] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(true);
  const [watchlistUpdating, setWatchlistUpdating] = useState(false);

  function handleSearchInputChange(e) {
    setSearch(e.target.value);
  }

  // Check if watchlist asset exists and load it
  const loadWatchlist = useCallback(async () => {
    setWatchlistLoading(true);
    try {
      const asset = await apiCall('assets/get/raw', {
        name: WATCHLIST_ASSET_NAME,
      });

      // Asset exists if we get a response (even if data is empty)
      if (asset) {
        setWatchlistExists(true);
        // The API returns parsed JSON in the 'json' field for raw assets containing valid JSON
        if (Array.isArray(asset.json)) {
          setWatchlist(asset.json);
        } else if (typeof asset.data === 'string' && asset.data.length > 0) {
          // Fallback: try to parse from data field if json field not present
          try {
            const pairs = JSON.parse(asset.data);
            setWatchlist(Array.isArray(pairs) ? pairs : []);
          } catch (e) {
            console.warn('Could not parse watchlist data:', asset.data);
            setWatchlist([]);
          }
        } else {
          setWatchlist([]);
        }
      } else {
        setWatchlistExists(false);
        setWatchlist([]);
      }
    } catch (error) {
      // API error means asset doesn't exist
      setWatchlistExists(false);
      setWatchlist([]);
    }
    setWatchlistLoading(false);
  }, []);

  // Create watchlist asset (requires PIN via secureApiCall)
  const createWatchlist = async () => {
    setWatchlistUpdating(true);
    try {
      const result = await secureApiCall('assets/create/raw', {
        name: WATCHLIST_ASSET_NAME,
        format: 'raw',
        data: '[]',
      });
      
      // Handle case where user cancels the PIN entry
      if (!result) {
        setWatchlistUpdating(false);
        return;
      }
      
      // Check for API success
      if (result.success) {
        dispatch(showSuccessDialog({
          message: 'Watchlist created successfully!',
          note: 'You can now add market pairs to your watchlist by clicking the star icon.',
        }));
        
        setWatchlistExists(true);
        setWatchlist([]);
      } else {
        dispatch(showErrorDialog({
          message: 'Failed to create watchlist',
          note: result?.error?.message || 'Unknown error occurred',
        }));
      }
    } catch (error) {
      dispatch(showErrorDialog({
        message: 'Failed to create watchlist',
        note: error?.message || 'Unknown error. Make sure you are logged in.',
      }));
    }
    setWatchlistUpdating(false);
  };

  // Toggle a market pair in the watchlist
  const toggleWatchlist = async (ticker) => {
    if (!watchlistExists || watchlistUpdating) return;
    
    const marketPair = `${ticker}/NXS`;
    const isInWatchlist = watchlist.includes(marketPair);
    
    const newWatchlist = isInWatchlist
      ? watchlist.filter(p => p !== marketPair)
      : [...watchlist, marketPair];
    
    setWatchlistUpdating(true);
    try {
      // Update requires PIN via secureApiCall
      const result = await secureApiCall('assets/update/raw', {
        name: WATCHLIST_ASSET_NAME,
        format: 'raw',
        data: JSON.stringify(newWatchlist),
      });
      
      // Handle case where user cancels the PIN entry
      if (!result) {
        setWatchlistUpdating(false);
        return;
      }
      
      // Only update local state if API succeeded
      if (result.success) {
        setWatchlist(newWatchlist);
      } else {
        dispatch(showErrorDialog({
          message: 'Failed to update watchlist',
          note: result?.error?.message || 'Unknown error occurred',
        }));
      }
    } catch (error) {
      dispatch(showErrorDialog({
        message: 'Failed to update watchlist',
        note: error?.message || 'Unknown error',
      }));
    }
    setWatchlistUpdating(false);
  };

  // Check if a ticker is in the watchlist
  const isWatched = (ticker) => {
    return watchlist.includes(`${ticker}/NXS`);
  };

  useEffect(() => {
    setSearchResults(tokenList.filter(token => token.ticker.toLowerCase().includes(search.toLowerCase())));
  } , [search]);

  const fetchTokens = async () => {

    try {
      const tokens = await apiCall(
        'register/list/finance:token/token,ticker,maxsupply,currentsupply',
        {
          sort: 'currentsupply',
          order: 'desc',
          limit: 100,
          where: 'results.currentsupply>0'
        }
      ).catch((error) => {
        dispatch(showErrorDialog({
          message: 'Cannot get tokens from apiCall (fetchTokens)',
          note: error?.message || 'Unknown error',
        }));
        return [];
        }
      );

      const globalNames = await apiCall(
        'register/list/names:global/register,address,name'
      ).catch((error) => {
        return [];
        }
      );

      let globalTokenList = tokens
        .filter(token => globalNames.some(name => name.register === token.token))
        .map(token => {
          const globalName = globalNames.find(name => name.register === token.token);
          return {
            name: globalName?.name || '',
            ticker: token.ticker,
            address: token.token,
          };
        });
    
      const tokenDataPromises = globalTokenList?.map(
        async (token) => {
        
          // Skip tokens without valid ticker
          if (!token.ticker || token.ticker === '') {
            return null;
          }

          const market = token.ticker + '/NXS';

          const [bidsVolume, asksVolume, lastExecuted, supply, bidList, askList] = await Promise.all([

            cachedApiCall(apiCall,
              'market/list/executed/contract.amount/sum', 
              {
                market,
                where: 'results.timestamp>since(`1 year`); AND results.type=bid',
              },
              MARKETS_CACHE_TTL
            ).catch(() => ({ amount: 0 })
            ),

            cachedApiCall(apiCall,
              'market/list/executed/order.amount/sum', 
              {
                market,
                where: 'results.timestamp>since(`1 year`); AND results.type=ask',
              },
              MARKETS_CACHE_TTL
            ).catch(() => ({ amount: 0 })
            ),

            cachedApiCall(apiCall,
              'market/list/executed/type,order.amount,contract.amount,timestamp',
              {
                market,
                sort: 'timestamp',
                order: 'desc',
                limit: 5,
                where: 'results.timestamp>since(`1 year`);',
              },
              MARKETS_CACHE_TTL
            ).catch(() => ({})
            ),

            cachedApiCall(apiCall,
              'register/get/finance:token/currentsupply,maxsupply',
              {
                name: token.ticker,
              },
              MARKETS_CACHE_TTL
            ).catch(() => ({ currentsupply: 0, maxsupply: 0 })
            ),

            cachedApiCall(apiCall,
              'market/list/bid/price,order.amount,contract.amount',
              {
                market,
                sort: 'price',
                order: 'desc',
                limit: 10, // Limit to top 10 bids for performance
              },
              MARKETS_CACHE_TTL
            ).catch(() => ({bids: []}),
            ),

            cachedApiCall(apiCall,
              'market/list/ask/price,order.amount,contract.amount',
              {
                market,
                sort: 'price',
                order: 'desc',
                limit: 10, // Limit to top 10 asks for performance
              },
              MARKETS_CACHE_TTL
            ).catch(() => ({asks: []}),
            ),

          ]);

          const volume = ((bidsVolume.amount || 0) + (asksVolume.amount || 0)) / 1e6;
          let lastPrice = 0;
          const lastExecutedAsks = lastExecuted.asks?.sort((a, b) => b.timestamp - a.timestamp) || [];
          const lastExecutedBids = lastExecuted.bids?.sort((a, b) => b.timestamp - a.timestamp) || [];

          // Get the most recent executed order to determine last price
          const askTimestamp = lastExecutedAsks[0]?.timestamp || 0;
          const bidTimestamp = lastExecutedBids[0]?.timestamp || 0;

          if (askTimestamp > bidTimestamp && lastExecutedAsks[0]) {
            lastPrice = (lastExecutedAsks[0].order.amount / 1e6) / lastExecutedAsks[0].contract.amount;
          } else if (bidTimestamp > askTimestamp && lastExecutedBids[0]) {
            lastPrice = (lastExecutedBids[0].contract.amount / 1e6) / lastExecutedBids[0].order.amount;
          } else if (lastExecutedAsks[0]) {
            // Fallback to ask if timestamps are equal
            lastPrice = (lastExecutedAsks[0].order.amount / 1e6) / lastExecutedAsks[0].contract.amount;
          } else if (lastExecutedBids[0]) {
            // Fallback to bid if no asks
            lastPrice = (lastExecutedBids[0].contract.amount / 1e6) / lastExecutedBids[0].order.amount;
          } else {
            lastPrice = 0;
          }

          const bids = bidList.bids;
          const asks = askList.asks;
          let sortedBids;
          let sortedAsks;

          if (bids.length > 0) {
            bids.forEach(element => {
              element.price = element.contract.amount / element.order.amount / 1e6;
            });
            sortedBids = bids.sort((a, b) => b.price - a.price);
          }

          if (asks.length > 0) {
            asks.forEach(element => {
              element.price = element.order.amount / element.contract.amount / 1e6;
            });
            sortedAsks = asks.sort((a, b) => a.price - b.price);
          }

          const bidPrice = bids?.length > 0 ? sortedBids[0].price : 0;
          const askPrice = asks?.length > 0 ? sortedAsks[0].price : 0;
      
          return {
            ticker: token.ticker,
            address: token.address,
            volume: volume,
            lastPrice: lastPrice,
            mCap: supply?.currentsupply * lastPrice,
            dilutedMcap: supply?.maxsupply * lastPrice,
            bid: bidPrice,
            ask: askPrice,
          };

        });

      globalTokenList = await Promise.all(tokenDataPromises);
      
      // Filter out null entries (tokens without valid tickers)
      globalTokenList = globalTokenList.filter(token => token !== null);
      
      setTokenList(globalTokenList);
      setSearchResults(globalTokenList);

      const sortedVolume = globalTokenList.sort((a, b) => b.volume - a.volume);
      const sortedMarketCap = [...globalTokenList].sort((a, b) => b.mCap - a.mCap);

      setTopVolumeMarkets(sortedVolume.slice(0, 10));
      setTopMarketCapMarkets(sortedMarketCap.slice(0, 10));

    } catch (error) {
      dispatch(showErrorDialog({
        message: 'Cannot get tokens from apiCall (fetchTokens)',
        note: error?.message || 'Unknown error',
      }));
    }
  };

  useEffect(() => {
    
    fetchTokens();
    loadWatchlist();

    // Set up 60 second interval
    const intervalId = setInterval(fetchTokens, 60000);
  
    // Cleanup on unmount
    return () => clearInterval(intervalId);

  }, [loadWatchlist]);

  const handleClick = async (item) => {
    
    const tokenData = await apiCall(
      'register/get/finance:token/token,ticker,maxsupply,currentsupply,decimals',
      {
        address: item.address,
      }
    ).catch((error) => {
      return {ticker: '', address: item.address, maxsupply: 0, currentsupply: 0, decimals: 0};
      }
    );

    if (item.ticker !== '') {
      dispatch(setMarketPair(
        item.ticker + '/NXS',
        item.ticker,
        'NXS',
        tokenData.maxsupply,
        0, // NXS has no max supply
        tokenData.currentsupply,
        0, 
        tokenData.decimals,
        6, // NXS has 6 decimals
        item.address,
        '0'));
    } else {
      dispatch(setMarketPair(
        item.address + '/NXS',
        '',
        'NXS',
        tokenData.maxsupply,
        0, // NXS has no max supply
        tokenData.currentsupply,
        0, 
        tokenData.decimals,
        6, // NXS has 6 decimals
        item.address,
        '0'));
    }

    dispatch(switchTab('Overview'));
    
    // set market pair as item.ticker + '/NXS'
    //dispatch(setMarketPair());
    //RefreshButton(item.ticker, 'NXS');
  };
  
  const renderMarkets = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const len = 10;
    return data.slice(0, len).map((item, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handleClick(item)}
      >
      <td><TickerText>{item.ticker}</TickerText></td>
      <td>
        {item.address
          ? `${item.address.slice(0, 3)}..${item.address.slice(-3)}`
          : ''
        }
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.lastPrice), 
          3
          )
        }
        {' NXS'}
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.volume), 
          3
          )
        }
        {' NXS'}
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.mCap), 
          3
          )
        }
        {' NXS'}
      </td>
      </OrderbookTableRow>
    )); 
  };

  const renderMarketsWide = (data, showStar = true) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const len = 20;
    return data.slice(0, len).map((item, index) => (
      <OrderbookTableRow
      key={index}
      >
      {showStar && watchlistExists && (
        <td style={{ width: '40px', textAlign: 'center' }}>
          <StarButton
            onClick={(e) => {
              e.stopPropagation();
              toggleWatchlist(item.ticker);
            }}
            disabled={watchlistUpdating}
            title={isWatched(item.ticker) ? 'Remove from watchlist' : 'Add to watchlist'}
            $filled={isWatched(item.ticker)}
          >
            {isWatched(item.ticker) ? '⭐' : '☆'}
          </StarButton>
        </td>
      )}
      {showStar && !watchlistExists && <td style={{ width: '40px' }}></td>}
      <td onClick={() => handleClick(item)} style={{ cursor: 'pointer' }}><TickerText>{item.ticker}</TickerText></td>
      <td onClick={() => handleClick(item)} style={{ cursor: 'pointer' }}>
        {item.address
          ? `${item.address.slice(0, 5)}...${item.address.slice(-5)}`
          : ''
        }
      </td>
      <td onClick={() => handleClick(item)} style={{ cursor: 'pointer' }}>
        {/*`${parseFloat(item.lastPrice).toFixed(5)} NXS`*/}
        {formatNumberWithLeadingZeros(
          parseFloat(item.lastPrice), 
          3
          )
        }
        {' NXS'}
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.bid), 
          3
          )
        }
        {' NXS'}
      </td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.ask), 
          3
          )
        }
        {' NXS'}
      </td>
      <td onClick={() => handleClick(item)} style={{ cursor: 'pointer' }}>
        {formatNumberWithLeadingZeros(
          parseFloat(item.volume), 
          3
          )
        }
        {' NXS'}
      </td>
      <td onClick={() => handleClick(item)} style={{ cursor: 'pointer' }}>
        {formatNumberWithLeadingZeros(
          parseFloat(item.mCap), 
          3
          )
        }
        {' NXS'}
      </td>
      <td onClick={() => handleClick(item)} style={{ cursor: 'pointer' }}>
        {formatNumberWithLeadingZeros(
          parseFloat(item.dilutedMcap), 
          3
          )
        }
        {' NXS'}
      </td>
      </OrderbookTableRow>
    )); 
  };

  // Get watchlist tokens data
  const watchlistTokens = tokenList.filter(token => 
    watchlist.includes(`${token.ticker}/NXS`)
  );

  return (
    <PageLayout>
      {/* Watchlist Section */}
      <div style={{ marginBottom: '24px' }}>
        <FieldSet legend="⭐ Watchlist">
          {watchlistLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
              Loading watchlist...
            </div>
          ) : !watchlistExists ? (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <p style={{ color: '#9ca3af', marginBottom: '16px' }}>
                Create a watchlist to save your favorite market pairs on-chain.
              </p>
              <CreateWatchlistButton
                onClick={createWatchlist}
                disabled={watchlistUpdating}
              >
                {watchlistUpdating ? 'Creating...' : 'Create Watchlist (2 NXS)'}
              </CreateWatchlistButton>
              <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '8px' }}>
                This will create an on-chain asset to store your watchlist.
              </p>
            </div>
          ) : watchlistTokens.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
              Your watchlist is empty. Click the ☆ icon next to any token below to add it.
            </div>
          ) : (
            <WideMarketsTable>
              <MarketsTableHeader>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Ticker</th>
                  <th>Register</th>
                  <th>Last price</th>
                  <th>Bid</th>
                  <th>Ask</th>
                  <th>1yr volume</th>
                  <th>Market cap</th>
                  <th style={{ minWidth: '190px' }}>Fully diluted MCap</th>
                </tr>
              </MarketsTableHeader>
              <tbody>{renderMarketsWide(watchlistTokens, true)}</tbody>
            </WideMarketsTable>
          )}
        </FieldSet>
      </div>

      <ResponsiveDualColRow> 
          <FieldSet legend="Top 10 by volume">
            <MarketsTable>
              <OrderbookTableHeader>
                <tr>
                  <th>Ticker</th>
                  <th>Register</th>
                  <th>Last Price</th>
                  <th>1yr volume</th>
                  <th>Market cap </th>
                </tr>
              </OrderbookTableHeader>
              <tbody>{renderMarkets(topVolumeMarkets)}</tbody>
            </MarketsTable>
          </FieldSet>
          <FieldSet legend="Top 10 by Market Cap">
              <MarketsTable>
                <OrderbookTableHeader>
                  <tr>
                    <th>Ticker</th>
                    <th>Register</th>
                    <th>Last Price</th>
                    <th>1yr volume</th>
                    <th>Market Cap </th>
                  </tr>
                </OrderbookTableHeader>
                <tbody>{renderMarkets(topMarketCapMarkets)}</tbody>
              </MarketsTable>
          </FieldSet>
      </ResponsiveDualColRow>
      <SingleColRow>
        <SearchField
          label="Search"
          name="search"
          value={search}
          onChange={handleSearchInputChange}
          placeholder="Search Token"
          >

        </SearchField>
      </SingleColRow>
      <div className="text-center">
        <FieldSet legend="Tokens">
          <WideMarketsTable>
            <MarketsTableHeader>
              <tr>
                <th style={{ width: '40px' }}>{watchlistExists ? '⭐' : ''}</th>
                <th>Ticker</th>
                <th>Register</th>
                <th>Last price</th>
                <th>Bid</th>
                <th>Ask</th>
                <th>1yr volume</th>
                <th>Market cap </th>
                <th style={{ minWidth: '190px' }}>Fully diluted MCap </th>
              </tr>
            </MarketsTableHeader>
            <tbody>{renderMarketsWide(searchResults, true)}</tbody>
          </WideMarketsTable>
        </FieldSet>
      </div>
    </PageLayout>
  );
}