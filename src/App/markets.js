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
            ticker: token.ticker
          };
        });
    
      const tokenDataPromises = globalTokenList?.map(
        async (token) => {
        
          const [bidsVolume, asksVolume, lastExecuted, supply] = await Promise.all([

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
              'register/get/finance:token/currentsupply',
              {
                name: token.ticker,
              }
            ).catch(() => ({ currentsupply: 0 })
            )

          ]);

          const volume = ((bidsVolume.amount || 0) + (asksVolume.amount || 0)) / 1e6;
          let lastPrice = 0;
          const lastExecutedAsks = lastExecuted.asks?.sort((a, b) => b.timestamp - a.timestamp);
          const lastExecutedBids = lastExecuted.bids?.sort((a, b) => b.timestamp - a.timestamp);


          if (lastExecutedAsks[0]?.timestamp > lastExecutedBids[0]?.timestamp) {
            lastPrice = (lastExecutedAsks[0]?.order.amount / 1e6) / lastExecutedAsks[0]?.contract.amount;
          } else if (lastExecutedBids[0]?.timestamp > lastExecutedAsks[0]?.timestamp) {
            lastPrice = (lastExecutedBids[0]?.contract.amount / 1e6) / lastExecutedBids[0]?.order.amount;
          }
      
          return {
            ticker: token.ticker,
            volume: volume,
            lastPrice: lastPrice,
            mCap: supply?.currentsupply * lastPrice
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

  const handleClick = (item) => {
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
      <td>{`${parseFloat(item.lastPrice).toFixed(3)} NXS`}</td>
      <td>{`${parseFloat(item.volume).toFixed(3)} NXS`}</td>
      <td>{`${parseFloat(item.mCap).toFixed(3)} NXS`}</td>
      </OrderbookTableRow>
    )); 
  };

  return (
    <PageLayout>
      <DualColRow> 
          <FieldSet legend="Top 10 token volume">
            <MarketsTable>
              <OrderbookTableHeader>
                <tr>
                  <th>Token</th>
                  <th>Price</th>
                  <th>1yr volume</th>
                  <th>Market cap </th>
                </tr>
              </OrderbookTableHeader>
              <tbody>{renderMarkets(topVolumeMarkets)}</tbody>
            </MarketsTable>
          </FieldSet>
          <FieldSet legend="Top 10 Market Cap">
              <MarketsTable>
                <OrderbookTableHeader>
                  <tr>
                    <th>Token</th>
                    <th>Price</th>
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
                <th>Token</th>
                <th>Price</th>
                <th>1yr volume</th>
                <th>Market cap </th>
              </tr>
            </MarketsTableHeader>
            <tbody>{renderMarkets(searchResults)}</tbody>
          </WideMarketsTable>
        </FieldSet>
      </div>
    </PageLayout>
  );
}