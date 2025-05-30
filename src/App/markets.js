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
  apiCall,
  FieldSet,
  TextField,
} from 'nexus-module';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setMarketPair, switchTab } from "actions/actionCreators";
import RefreshButton from "./RefreshButton";
import { formatNumberWithLeadingZeros } from 'actions/formatNumber';

const SearchField = styled(TextField)({
  maxWidth: 200,
});

export default function Markets() {
  
  const dispatch = useDispatch();
  const num = 50;
  const [topVolumeMarkets, setTopVolumeMarkets] = useState([]); 
  const [topMarketCapMarkets, setTopMarketCapMarkets] = useState([]);
  const [tokenList, setTokenList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [search, setSearch] = useState('');

  function handleSearchInputChange(e) {
    setSearch(e.target.value);
  }

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
        
          const [bidsVolume, asksVolume, lastExecuted, supply, bidList, askList] = await Promise.all([

            apiCall( 
              'market/list/executed/contract.amount/sum', 
              {
                market: token.ticker + '/NXS',
                where: 'results.timestamp>since(`1 year`); AND results.type=bid',
              }
            ).catch(() => ({ amount: 0 })
            ),

            apiCall( 
              'market/list/executed/order.amount/sum', 
              {
                market: token.ticker + '/NXS',
                where: 'results.timestamp>since(`1 year`); AND results.type=ask',
              }
            ).catch(() => ({ amount: 0 })
            ),

            apiCall(
              'market/list/executed/type,order.amount,contract.amount,timestamp',
              {
                market: token.ticker + '/NXS',
                sort: 'timestamp',
                order: 'desc',
                limit: 5,
                where: 'results.timestamp>since(`1 year`);',
              }
            ).catch(() => ({})
            ),

            apiCall(
              'register/get/finance:token/currentsupply,maxsupply',
              {
                name: token.ticker,
              }
            ).catch(() => ({ currentsupply: 0, maxsupply: 0 })
            ),

            apiCall(
              'market/list/bid/price,order.amount,contract.amount',
              {
                market: token.ticker + '/NXS',
                sort: 'price',
                order: 'desc',
                //limit: 2,
              }
            ).catch(() => ({bids: []}),
            ),

            apiCall(
              'market/list/ask/price,order.amount,contract.amount',
              {
                market: token.ticker + '/NXS',
                sort: 'price',
                order: 'desc',
                //limit: 2,
              }
            ).catch(() => ({asks: []}),
            ),

          ]);

          const volume = ((bidsVolume.amount || 0) + (asksVolume.amount || 0)) / 1e6;
          let lastPrice = 0;
          const lastExecutedAsks = lastExecuted.asks?.sort((a, b) => b.timestamp - a.timestamp);
          const lastExecutedBids = lastExecuted.bids?.sort((a, b) => b.timestamp - a.timestamp);


          if (lastExecutedAsks[0]?.timestamp > lastExecutedBids[0]?.timestamp) {
            lastPrice = (lastExecutedAsks[0]?.order.amount / 1e6) / lastExecutedAsks[0]?.contract.amount;
          } else if (lastExecutedBids[0]?.timestamp > lastExecutedAsks[0]?.timestamp) {
            lastPrice = (lastExecutedBids[0]?.contract.amount / 1e6) / lastExecutedBids[0]?.order.amount;
          } else if (lastExecutedAsks.length === 0 && lastExecutedBids.length === 0) {
            lastPrice = 0;
          } else {
            lastPrice = (lastExecutedAsks[0]?.order.amount / 1e6) / lastExecutedAsks[0]?.contract.amount;
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

    // Set up 60 second interval
    const intervalId = setInterval(fetchTokens, 300000);
  
    // Cleanup on unmount
    return () => clearInterval(intervalId);

  }, []);

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

  const renderMarketsWide = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const len = 20;
    return data.slice(0, len).map((item, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handleClick(item)}
      >
      <td><TickerText>{item.ticker}</TickerText></td>
      <td>
        {item.address
          ? `${item.address.slice(0, 5)}...${item.address.slice(-5)}`
          : ''
        }
      </td>
      <td>
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
      <td>
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

  return (
    <PageLayout>
      <DualColRow> 
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
      </DualColRow>
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
                <th>Ticker</th>
                <th>Register</th>
                <th>Last price</th>
                <th>Bid</th>
                <th>Ask</th>
                <th>1yr volume</th>
                <th>Market cap </th>
                <th>Fully diluted MCap </th>
              </tr>
            </MarketsTableHeader>
            <tbody>{renderMarketsWide(searchResults)}</tbody>
          </WideMarketsTable>
        </FieldSet>
      </div>
    </PageLayout>
  );
}