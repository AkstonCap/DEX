//import { useSelector } from 'react-redux';
import OrderBookComp from 'components/OrderBookComp';
import TradeForm from 'components/TradeForm';
import TradeHistory from 'components/TradeHistory';
import PersonalTradeHistory from 'components/PersonalTradeHistory';
import PersonalOpenOrders from 'components/PersonalOpenOrders';
import { 
  PageLayout, 
  TopRow, 
  BottomRow, 
} from 'components/styles';

export default function Trade() {
  //const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);

  return (
    <PageLayout>
      <TopRow>
        <TradeForm />
        <OrderBookComp />
      </TopRow>
      <BottomRow>
        <TradeHistory />
        <PersonalTradeHistory />
        <PersonalOpenOrders />
      </BottomRow>
    </PageLayout>
  );
}