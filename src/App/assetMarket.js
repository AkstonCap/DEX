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

export default function AssetMarkets() {
  
  const dispatch = useDispatch();
  const num = 50; 
  const [topPriceAssets, setTopPriceAssets] = useState([]);
  const [assetList, setAssetList] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [search, setSearch] = useState('');

  function handleSearchInputChange(e) {
    setSearch(e.target.value);
  }

  useEffect(() => {
    setSearchResults(assetList.filter(asset => asset.address.includes(search)));
  } , [search]);

  const fetchAssets = async () => {

    try {
      const assets = await apiCall(
        'register/list/assets:asset', //
        {
          sort: 'modified',
          order: 'desc',
          limit: 100,
        }
      ).catch((error) => {
        dispatch(showErrorDialog({
          message: 'Cannot get assets from apiCall (fetchAssets)',
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

      let globalAssetList = assets
        .filter(asset => globalNames.some(name => name.register === asset.address))
        .map(asset => {
          const globalName = globalNames.find(name => name.register === asset.address);
          return {
            name: globalName?.name || '',
            address: asset.address
          };
        });
    
      const assetDataPromises = globalAssetList?.map(
        async (asset) => {
        
          const [bidsVolume, asksVolume, lastExecuted, bidList, askList] = await Promise.all([

            apiCall( 
              'market/list/executed/contract.amount/sum', 
              {
                market: asset.address + '/NXS',
                where: 'results.timestamp>since(`1 year`); AND results.type=bid',
              }
            ).catch(() => ({ amount: 0 })
            ),

            apiCall( 
              'market/list/executed/order.amount/sum', 
              {
                market: asset.address + '/NXS',
                where: 'results.timestamp>since(`1 year`); AND results.type=ask',
              }
            ).catch(() => ({ amount: 0 })
            ),

            apiCall(
              'market/list/executed/type,order.amount,contract.amount,timestamp',
              {
                market: asset.address + '/NXS',
                sort: 'timestamp',
                order: 'desc',
                limit: 5,
                where: 'results.timestamp>since(`1 year`);',
              }
            ).catch(() => ({})
            ),

            apiCall(
              'market/list/bid/price,order.amount,contract.amount',
              {
                market: asset.address + '/NXS',
                sort: 'price',
                order: 'desc',
                //limit: 2,
              }
            ).catch(() => ({bids: []}),
            ),

            apiCall(
              'market/list/ask/price,order.amount,contract.amount',
              {
                market: asset.address + '/NXS',
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
            address: asset.address,
            volume: volume,
            lastPrice: lastPrice,
            bid: bidPrice,
            ask: askPrice,
          };

        });

      globalAssetList = await Promise.all(assetDataPromises);
      
      setAssetList(globalAssetList);
      setSearchResults(globalAssetList);

      const sortedPrice = [...globalAssetList].sort((a, b) => b.lastPrice - a.lastPrice);

      setTopPriceAssets(sortedPrice.slice(0, 10));
      
    } catch (error) {
      dispatch(showErrorDialog({
        message: 'Cannot get assets from apiCall (fetchAssets)',
        note: error?.message || 'Unknown error',
      }));
    }
  };

  useEffect(() => {
    
    fetchAssets();

    // Set up 60 second interval
    const intervalId = setInterval(fetchAssets, 300000);
  
    // Cleanup on unmount
    return () => clearInterval(intervalId);

  }, []);

  const handleClick = (item) => {
    // set market pair as item.ticker + '/NXS'
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
      <td><TickerText>{item.address}</TickerText></td>
      <td>{`${parseFloat(item.lastPrice).toFixed(4)} NXS`}</td>
      <td>{`${parseFloat(item.volume).toFixed(3)} NXS`}</td>
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
      <td><TickerText>{item.address}</TickerText></td>
      <td>
        {formatNumberWithLeadingZeros(
          parseFloat(item.lastPrice), 
          3
          )
        }
      </td>
      <td>{`${parseFloat(item.bidPrice).toFixed(3)} NXS`}</td>
      <td>{`${parseFloat(item.askPrice).toFixed(3)} NXS`}</td>
      <td>{`${parseFloat(item.volume).toFixed(3)} NXS`}</td>
      </OrderbookTableRow>
    )); 
  };

  return (
    <PageLayout>
      <SingleColRow> 
          <FieldSet legend="Top 10 assets by Market Cap">
              <MarketsTable>
                <OrderbookTableHeader>
                  <tr>
                    <th>Asset</th>
                    <th>Price</th>
                    <th>1yr volume</th>
                  </tr>
                </OrderbookTableHeader>
                <tbody>{renderMarkets(topPriceAssets)}</tbody>
              </MarketsTable>
          </FieldSet>
      </SingleColRow>
      <SingleColRow>
        <SearchField
          label="Search"
          name="search"
          value={search}
          onChange={handleSearchInputChange}
          placeholder="Search Asset"
          >
        </SearchField>
      </SingleColRow>
      <div className="text-center">
        <FieldSet legend="Assets">
          <WideMarketsTable>
            <MarketsTableHeader>
              <tr>
                <th>Asset</th>
                <th>Price</th>
                <th>Bid</th>
                <th>Ask</th>
                <th>1yr volume</th>
              </tr>
            </MarketsTableHeader>
            <tbody>{renderMarketsWide(searchResults)}</tbody>
          </WideMarketsTable>
        </FieldSet>
      </div>
    </PageLayout>
  );
}
