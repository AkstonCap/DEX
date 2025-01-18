import { PageLayout } from "components/styles";
import { 
  showErrorDialog, 
  apiCall 
} from 'nexus-module';
import { useState } from 'react';
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
      
      const tradesBids = await apiCall( 
        'market/list/executed/timestamp,price,type,contract.amount,contract.ticker,order.amount,order.ticker', 
        {
          market: token.ticker + '/NXS',
          sort: 'timestamp', 
          order: 'desc', 
          limit: 100,
          where: 'results.timestamp>since(`1 day`); AND results.type=bid',
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

      const tradesAsks = await apiCall( 
        'market/list/executed/timestamp,price,type,contract.amount,contract.ticker,order.amount,order.ticker', 
        {
          market: token.ticker + '/NXS',
          sort: 'timestamp', 
          order: 'desc', 
          limit: 100,
          where: 'results.timestamp>since(`1 day`); AND results.type=ask',
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

    });
  };

  const handleClick = (item) => {
  };
  
  const renderMarkets = (data) => {
    if (!Array.isArray(data)) {
      return null;
    }
    const len = data.length;
    /*return data.slice(0, Math.min(num, len)).map((item, index) => (
      <OrderbookTableRow
      key={index}
      onClick={() => handleClick(item)}
      orderType={item.type}
      >
      <td>{parseFloat(item.price).toFixed(Math.min(3, quoteTokenDecimals))}</td>
      <td>{`${parseFloat(item.order.amount).toFixed(Math.min(3, baseTokenDecimals))} ${item.order.ticker}`}</td>
      <td>{`${parseFloat(item.contract.amount).toFixed(Math.min(3, quoteTokenDecimals))} ${item.contract.ticker}`}</td>
      </OrderbookTableRow>
    ));*/
  };

  return (
    <PageLayout>
        <div className="text-center">
            <p>
                List of trending market pairs coming soon...
            </p>
        </div>
        <div>

        </div>
    </PageLayout>
  );
}