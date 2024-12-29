import { useSelector } from 'react-redux';
import OrderBookComp from 'components/OrderBookComp';
import TradeForm from 'components/TradeForm';
import TradeHistory from 'components/TradeHistory';
import PersonalTradeHistory from 'components/PersonalTradeHistory';
import PersonalOpenOrders from 'components/PersonalOpenOrders';
import { 
  PageLayout, 
  TopRow, 
  BottomRow, 
  TradingContainer 
} from 'components/styles';

export default function Trade() {
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);

  return (
    <div className="mt2">
      <h1>Trading Dashboard</h1>
      <h2>{marketPair}</h2>
      <PageLayout>
        <TopRow>
          <TradingContainer>
            <TradeForm />
          </TradingContainer>
          <TradingContainer>
            <OrderBookComp />
          </TradingContainer>
        </TopRow>
        <BottomRow>
          <TradingContainer>
            <TradeHistory />
          </TradingContainer>
          <TradingContainer>
            <PersonalTradeHistory />
          </TradingContainer>
          <TradingContainer>
            <PersonalOpenOrders />
          </TradingContainer>
        </BottomRow>
      </PageLayout>
    </div>
  );
}