import { 
  PageLayout, 
  OrderbookTableHeader, 
  OrderbookTableRow, 
  OrderTable,
  MarketsTable
} from "components/styles";
import { 
  showErrorDialog, 
  apiCall 
} from 'nexus-module';
import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

export default function Markets() {
  
  const dispatch = useDispatch();
  const num = 50;
  const [markets, setMarkets] = useState([]); 

  const fetchTokens = (
  ) => async (
  ) => {

    const tokens = await apiCall('register/list/finance:tokens/token,ticker,maxsupply,currentsupply',
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
      dispatch(showErrorDialog({
        message: 'Cannot get global names from apiCall (fetchTokens)',
        note: error?.message || 'Unknown error',
      }));
      return [];
      }
    );

    const globalTokenList = tokens
      .filter(token => globalNames.some(name => name.register === token.token))
      .map(token => {
        const globalName = globalNames.find(name => name.register === token.token);
        return {
          name: globalName?.name || '',
          ticker: token.ticker
        };
      });
    
    globalTokenList.forEach(async (token) => {
      
      const bidsVolume = await apiCall( 
        'market/list/executed/contract.amount/sum', 
        {
          market: token.ticker + '/NXS',
          where: 'results.timestamp>since(`1 week`); AND results.type=bid',
        }
      ).catch((error) => {
        dispatch(showErrorDialog({
          message: 'Cannot get executed transactions from apiCall (fetchExecuted)',
          note: error?.message || 'Unknown error',
        }));
        const data={bids: [], asks: []};
        dispatch(setExecutedOrders(data));
        }
      );

      const asksVolume = await apiCall( 
        'market/list/executed/order.amount/sum', 
        {
          market: token.ticker + '/NXS',
          where: 'results.timestamp>since(`1 week`); AND results.type=ask',
        }
      ).catch((error) => {
        dispatch(showErrorDialog({
          message: 'Cannot get executed transactions from apiCall (fetchExecuted)',
          note: error?.message || 'Unknown error',
        }));
        const data={bids: [], asks: []};
        dispatch(setExecutedOrders(data));
        }
      );

      token.volume = (bidsVolume + asksVolume)/1e6;

    });

    const sorted = globalTokenList.sort((a, b) => b.volume - a.volume);
    const hotList = sorted.slice(0, 10);

    setMarkets(hotList);

  };

  useEffect(() => {
    fetchTokens();
  }, []);

  const handleClick = (item) => {
  };
  
  const renderMarkets = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const len = data.length;
    return data.slice(0, len).map((item, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handleClick(item)}
      >
      <td>{item.name}</td>
      <td>{`${parseFloat(item.volume).toFixed(3)} NXS`}</td>
      <td></td>
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
          <MarketsTable>
            <OrderbookTableHeader>
              <tr>
                <th>Name</th>
                <th>Volume</th>
                <th>Mcap </th>
              </tr>
            </OrderbookTableHeader>
            <tbody>{renderMarkets(markets)}</tbody>
          </MarketsTable>
        </div>
    </PageLayout>
  );
}