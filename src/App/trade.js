import { useSelector } from 'react-redux';
import OrderBookComp from 'components/OrderBookComp';
import TradeForm from 'components/TradeForm';
import TradeHistory from 'components/TradeHistory';
import { tradeGridContainer } from 'components/styles';

export default function Trade() {
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);

  return (
    <div className="mt2">
      <h1>Trading Dashboard</h1>
      <h2>{marketPair}</h2>
      <div className="mt2">
      <tradeGridContainer>
          <div className="mt2">
            <OrderBookComp />
          </div>
          <div className="mt2">
            <TradeForm />
          </div>
          <div className="mt2">
            <TradeHistory />
          </div>
        </tradeGridContainer>
      </div>
    </div>
  );
}