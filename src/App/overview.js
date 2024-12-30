import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FieldSet } from 'nexus-module';
import { fetchVolumeData } from 'actions/fetchVolumeData';
import { fetchMarketData } from 'actions/fetchMarketData';
import { 
  BottomRow,
  TopRow,
  PageLayout,
 } from 'components/styles';
import OrderBookComp from 'components/OrderBookComp';
import TradeHistory from 'components/TradeHistory';
import PersonalTradeHistory from 'components/PersonalTradeHistory';
//import 'components/layout.css';
import PersonalOpenOrders from 'components/PersonalOpenOrders';

export default function Overview() {
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);

  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const executedOrders = useSelector(
    (state) => state.ui.market.executedData.executedOrders
  );

  // Declare state variables
  const [baseTokenVolume, setBaseTokenVolume] = useState(0);
  const [quoteTokenVolume, setQuoteTokenVolume] = useState(0);
  const [lastPrice, setLastPrice] = useState('N/A');
  const [highestBid, setHighestBid] = useState('N/A');
  const [lowestAsk, setLowestAsk] = useState('N/A');

  // Define updateData function at the component level
  const updateData = () => {
    if (
      executedOrders &&
      (executedOrders.bids?.length > 0 || executedOrders.asks?.length > 0)
    ) {
      const volumeData = fetchVolumeData(executedOrders);
      setBaseTokenVolume(volumeData.baseTokenVolume);
      setQuoteTokenVolume(volumeData.quoteTokenVolume);

      const sortedExecutedOrders = [
        ...executedOrders.bids,
        ...executedOrders.asks,
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setLastPrice(sortedExecutedOrders[0]?.price || 'N/A');
    } else {
      setBaseTokenVolume(0);
      setQuoteTokenVolume(0);
      setLastPrice('N/A');
    }

    setHighestBid(orderBook?.bids?.[0]?.price || 'N/A');
    setLowestAsk(orderBook?.asks?.[0]?.price || 'N/A');
  };

  useEffect(() => {
    fetchMarketData();

    // Set interval to update data every 60 seconds
    const intervalId = setInterval(updateData, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    // Update data when dependencies change
    updateData();
  }, [marketPair, executedOrders, orderBook]);

  return (
    <PageLayout>
      <TopRow>
        <div className='mt2'>
          <FieldSet legend={`${marketPair} overview`}>
            <p>
              Last Price: {lastPrice !== null ? `${lastPrice} ${quoteToken}` : 'N/A'}
            </p>
            <p>
              Bid/Ask: {highestBid} {quoteToken} / {lowestAsk} {quoteToken}
            </p>
            <p>
              1yr Volume: {baseTokenVolume} {baseToken} / {quoteTokenVolume} {quoteToken}
            </p>
          </FieldSet>
        </div>
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
