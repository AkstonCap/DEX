//import { useSelector } from 'react-redux';
import OrderBookComp from 'components/OrderBookComp';
import TradeForm from 'components/TradeForm';
import PersonalTradeHistory from 'components/PersonalTradeHistory';
import PersonalOpenOrders from 'components/PersonalOpenOrders';
import {
  PageLayout,
  TopRow,
  TradeBottomRow,
} from 'components/styles';

export default function Trade() {
  //const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);

  return (
    <PageLayout>
      <TopRow>
        <TradeForm />
        <OrderBookComp num={6}/>
      </TopRow>
      <TradeBottomRow>
        <PersonalTradeHistory />
        <PersonalOpenOrders />
      </TradeBottomRow>
    </PageLayout>
  );
}