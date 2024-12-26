import { useSelector } from 'react-redux';
import OrderBookComp from 'components/OrderBookComp';
import TradeForm from 'components/TradeForm';
import TradeHistory from 'components/TradeHistory';
import PersonalTradeHistory from 'components/PersonalTradeHistory';
import PersonalOpenOrders from 'components/PersonalOpenOrders';
import { tradeGridContainer } from 'components/styles';
import 'components/layout.css';

export default function Trade() {
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);

  return (
    <div className="mt2">
      <h1>Trading Dashboard</h1>
      <h2>{marketPair}</h2>
      <div className="overview-page">
            <div className='top-row'>
              <div className='trading-container'>
                <TradeForm />
              </div>
              <div className='orderbook-container'>
                <OrderBookComp />
              </div>
            </div>
            <div className='bottom-row'>
              <div trade-history-container>
                <TradeHistory />
              </div>
              <div className="personal-trade-history-container">
                <PersonalTradeHistory />
              </div>
              <div className="personal-open-orders-container">
                <PersonalOpenOrders />
              </div>
            </div>
          </div>
    </div>
  );
}