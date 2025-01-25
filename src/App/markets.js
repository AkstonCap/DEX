import { 
  PageLayout, 
  OrderbookTableHeader, 
  OrderbookTableRow, 
  OrderTable,
  MarketsTable,
  TradeBottomRow
} from "components/styles";
import { 
  showErrorDialog, 
  apiCall,
  FieldSet, 
} from 'nexus-module';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

export default function Markets() {
  
  const dispatch = useDispatch();
  const num = 50;
  const [topVolumeMarkets, setTopVolumeMarkets] = useState([]); 
  const [topMarketCapMarkets, setTopMarketCapMarkets] = useState([]);

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
          ).catch((error) => {
            return 0;
            }
          ),

          apiCall( 
            'market/list/executed/order.amount/sum', 
            {
              market: token.ticker + '/NXS',
              where: 'results.timestamp>since(`1 year`); AND results.type=ask',
            }
          ).catch((error) => {
            return 0;
            }
          ),

          apiCall(
            'market/list/executed/type,order.amount,contract.amount',
            {
              market: token.ticker + '/NXS',
              sort: 'timestamp',
              order: 'desc',
              limit: 5,
              where: 'results.timestamp>since(`1 year`);',
            }
          ).catch((error) => {
            return [];
            }
          ),

          apiCall(
            'register/get/finance:token/currentsupply',
            {
              name: token.ticker,
            }
          ).catch((error) => {
            return 0;
            }
          )
        ]);

        const volume = (bidsVolume + asksVolume) / 1e6;
        let lastPrice = 0;

        if (lastExecuted?.length > 0) {
          lastPrice = lastExecuted[0].type === 'ask'
            ? (lastExecuted[0].order.amount / 1e6) / lastExecuted[0].contract.amount
            : (lastExecuted[0].contract.amount / 1e6) / lastExecuted[0].order.amount;
        }
      
        return {
          ticker: token.ticker,
          volume: volume,
          lastPrice: lastPrice,
          mCap: supply.currentsupply * lastPrice
        };

      });

      globalTokenList = await Promise.all(tokenDataPromises);

      const sortedVolume = [...globalTokenList].sort((a, b) => b.volume - a.volume);
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
      <td>{item.ticker}</td>
      <td>{`${parseFloat(item.lastPrice).toFixed(3)} NXS`}</td>
      <td>{`${parseFloat(item.volume).toFixed(3)} NXS`}</td>
      <td>{`${parseFloat(item.mCap).toFixed(3)} NXS`}</td>
      </OrderbookTableRow>
    )); 
  };

  return (
    <PageLayout>
        <div className="text-center">
            <p>
                List of trending market pairs coming soon...
            </p>
        </div>
        <div className="text-center">
          
          <TradeBottomRow>
            <FieldSet legend="Top 10 tokens weekly volume">
              <MarketsTable>
                <OrderbookTableHeader>
                  <tr>
                    <th>Token</th>
                    <th>Price</th>
                    <th>1yr volume</th>
                    <th>Mcap </th>
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
                    <th>Mcap </th>
                  </tr>
                </OrderbookTableHeader>
                <tbody>{renderMarkets(topMarketCapMarkets)}</tbody>
              </MarketsTable>
            </FieldSet>
          </TradeBottomRow>
          
        </div>
    </PageLayout>
  );
}