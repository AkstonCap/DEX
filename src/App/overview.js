import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { 
  FieldSet,
  Arrow,
  Dropdown,
  Select,
  FormField,
 } from 'nexus-module';
import { fetchVolumeData } from 'actions/fetchVolumeData';
import { fetchMarketData } from 'actions/fetchMarketData';
import { 
  BottomRow,
  TopRow,
  PageLayout,
  ChangeText,
  Line,
  Value,
  Label,
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
    (state) => state.ui.market.executedOrders
  );

  // Declare state variables
  const [baseTokenVolume, setBaseTokenVolume] = useState(0);
  const [quoteTokenVolume, setQuoteTokenVolume] = useState(0);
  const [lastPrice, setLastPrice] = useState(0);
  const [high, setHigh] = useState(0);
  const [low, setLow] = useState(0);
  const [change, setChange] = useState(0);
  const [timeFrame, setTimeFrame] = useState('1y');
  const [highestBid, setHighestBid] = useState('N/A');
  const [lowestAsk, setLowestAsk] = useState('N/A');

  const timeFrames = [
    {
      value: 'all',
      display: ('All'),
    },
    {
      value: '1y',
      display: ('1 Year'),
    },
    {
      value: '1m',
      display: ('1 Month'),
    },
    {
      value: '1w',
      display: ('1 Week'),
    },
    {
      value: '1d',
      display: ('1 Day'),
    },
    {
      value: '1h',
      display: ('1 Hour'),
    },
  ];

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

      const highPrice = Math.max(
        ...sortedExecutedOrders.map((order) => order.price)
      );
      setHigh(highPrice);

      const lowPrice = Math.min(
        ...sortedExecutedOrders.map((order) => order.price)
      );
      setLow(lowPrice);

      const changePercentage = (
        ((lastPrice - sortedExecutedOrders[sortedExecutedOrders.length - 1].price) /
          sortedExecutedOrders[sortedExecutedOrders.length - 1].price) *
        100
      ).toFixed(2);
      setChange(changePercentage);

    } else {
      setBaseTokenVolume(0);
      setQuoteTokenVolume(0);
      setLastPrice('N/A');
    }

    setHighestBid(orderBook?.bids?.[0]?.price || 'N/A');
    setLowestAsk(
      orderBook?.asks?.[orderBook?.asks?.length - 1]?.price || 'N/A'
    );
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
        <div>
          <FieldSet legend={`${marketPair} overview`}>
            
            <Line>
              <div>
                <Label>Last Price:</Label>
                <Value>{lastPrice}</Value>
              </div>
              <div>
                <Label>High</Label>
                <Value>{high}</Value>
              </div>
              <div>
                <Label>Volume ({baseToken})</Label>
                <Value>{baseTokenVolume}</Value>
              </div>
            </Line>
            <Line>
              <div>
                <Label>Change:</Label>
                <Value>{change} %</Value>
              </div>
              <div>
                <Label>Low</Label>
                <Value>{low}</Value>
              </div>
              <div>
                <Label>Volume ({quoteToken})</Label>
                <Value>{quoteTokenVolume}</Value>
              </div>
            </Line>
            <div className='mt3'>
              <FormField label={('Time span')}>
                <Select
                  value={timeFrame}
                  onChange={(val) => dispatch(setTimeFrame(val))}
                  options={timeFrames}
                />
              </FormField>
            </div>
          </FieldSet>
        </div>
        <OrderBookComp num={6} />
      </TopRow>
      <BottomRow>
        <TradeHistory num={10} />
        <PersonalTradeHistory />
        <PersonalOpenOrders />
      </BottomRow>
    </PageLayout>
  );
}
