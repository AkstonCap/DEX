import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  FieldSet,
  Arrow,
  Dropdown,
  Select,
  FormField,
 } from 'nexus-module';
import { fetchVolumeData } from 'actions/fetchVolumeData';
import { fetchMarketData } from 'actions/fetchMarketData';
import { setTimeSpan } from 'actions/actionCreators';
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
import { formatNumberWithLeadingZeros } from 'actions/formatNumber';
import HoldersList from 'components/HoldersList';

export default function Overview() {
  const dispatch = useDispatch();
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const baseTokenCirculatingSupply = useSelector((state) => state.ui.market.marketPairs.baseTokenCirculatingSupply);
  const baseTokenMaxsupply = useSelector((state) => state.ui.market.marketPairs.baseTokenMaxsupply);

  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const executedOrders = useSelector(
    (state) => state.ui.market.executedOrders
  );
  const timeSpan = useSelector((state) => state.settings.timeSpan);

  // Declare state variables
  const [baseTokenVolume, setBaseTokenVolume] = useState(0);
  const [quoteTokenVolume, setQuoteTokenVolume] = useState(0);
  const [lastPrice, setLastPrice] = useState(0);
  const [high, setHigh] = useState(0);
  const [low, setLow] = useState(0);
  const [change, setChange] = useState(0);
  //const [timeFrame, setTimeFrame] = useState('1y');
  const [highestBid, setHighestBid] = useState('N/A');
  const [lowestAsk, setLowestAsk] = useState('N/A');
  const [mcap, setMcap] = useState(lastPrice * baseTokenCirculatingSupply);

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
    /*{
      value: '1h',
      display: ('1 Hour'),
    },*/
  ];

  // Helper to collapse long token names/addresses
  function formatTokenName(token) {
    if (typeof token === 'string' && token.length > 20) {
      return token.slice(0, 4) + '...' + token.slice(-4);
    }
    return token;
  }

  // Define updateData function at the component level
  const updateData = (executedOrders, orderBook) => {
    if (
      executedOrders &&
      (executedOrders.bids?.length > 0 || executedOrders.asks?.length > 0)
    ) {
      const volumeData = fetchVolumeData(executedOrders);
      setBaseTokenVolume(volumeData.baseTokenVolume.toFixed(Math.min(3, baseTokenDecimals)));
      setQuoteTokenVolume(volumeData.quoteTokenVolume.toFixed(Math.min(3, quoteTokenDecimals)));

      const sortedExecutedOrders = [
        ...executedOrders.bids,
        ...executedOrders.asks,
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
      setLastPrice(sortedExecutedOrders[0]?.price || 'N/A');
      
      //setMcap((lastPrice * baseTokenCirculatingSupply).toFixed(Math.min(2, quoteTokenDecimals)));

      const highPrice = Math.max(
        ...sortedExecutedOrders.map((order) => order.price)
      ).toFixed(Math.min(8, quoteTokenDecimals));
      setHigh(highPrice);

      const lowPrice = Math.min(
        ...sortedExecutedOrders.map((order) => order.price)
      ).toFixed(Math.min(8, quoteTokenDecimals));
      setLow(lowPrice);

      const changePercentage = (
        ((lastPrice - sortedExecutedOrders[sortedExecutedOrders.length - 1].price) /
          sortedExecutedOrders[sortedExecutedOrders.length - 1].price) *
        100
      ).toFixed(1);
      setChange(changePercentage);

    } else {
      setBaseTokenVolume(0);
      setQuoteTokenVolume(0);
      setLastPrice('N/A');
      setHigh(0);
      setLow(0);
    }

    setHighestBid(orderBook?.bids?.[0]?.price || 'N/A');
    setLowestAsk(
      orderBook?.asks?.[orderBook?.asks?.length - 1]?.price || 'N/A'
    );
  };

  useEffect(() => {
    setMcap((lastPrice * baseTokenCirculatingSupply).toFixed(Math.min(2, quoteTokenDecimals)));
  }, [lastPrice, baseTokenCirculatingSupply]);

  useEffect(() => {

    // Fetch data immediately
    updateData(executedOrders, orderBook);

    /*// Fetch data every 5 seconds
    const intervalId = setInterval(updateData, 5000);
  
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
*/
  }, [marketPair, executedOrders, orderBook]);

  return (
    <PageLayout>
      <TopRow>
        <div>
          <FieldSet legend={`${formatTokenName(baseToken)}/${formatTokenName(quoteToken)} overview`}>
            <Line>
              <div>
                <Label>Last Price:</Label>
                <Value>
                  {formatNumberWithLeadingZeros(
                  parseFloat(lastPrice), 
                  3,
                  quoteTokenDecimals
                  )}
                </Value>
              </div>
              <div>
                <Label>High</Label>
                <Value>{formatNumberWithLeadingZeros(
                  parseFloat(high), 
                  3,
                  quoteTokenDecimals
                  )}
                </Value>
              </div>
              <div>
                <Label>Volume ({formatTokenName(baseToken)})</Label>
                <Value>
                  {formatNumberWithLeadingZeros(
                  parseFloat(baseTokenVolume), 
                  3,
                  baseTokenDecimals
                  )}
                </Value>
              </div>
            </Line>
            <Line>
              <div>
                <Label>Change:</Label>
                <Value>{change} %</Value>
              </div>
              <div>
                <Label>Low</Label>
                <Value>{formatNumberWithLeadingZeros(
                  parseFloat(low), 
                  3,
                  quoteTokenDecimals
                  )}
                </Value>
              </div>
              <div>
                <Label>Volume ({formatTokenName(quoteToken)})</Label>
                <Value>
                  {formatNumberWithLeadingZeros(
                  parseFloat(quoteTokenVolume), 
                  3,
                  quoteTokenDecimals
                  )}
                </Value>
              </div>
            </Line>
            <div className='mt3'>
              <FormField label={('Time span')}>
                <Select
                  value={timeSpan}
                  onChange={(val) => dispatch(setTimeSpan(val))}
                  options={timeFrames}
                />
              </FormField>
            </div>
            <div className='mt3'>
              <Line>
                <div>
                  <Label>{formatTokenName(baseToken)} Mcap</Label>
                  <Value>
                    {formatNumberWithLeadingZeros(
                    parseFloat(mcap), 
                    3,
                    quoteTokenDecimals
                    )} {formatTokenName(quoteToken)}
                  </Value>
                </div>
                <div>
                  <Label>Circulating Supply {formatTokenName(baseToken)}</Label>
                  <Value>
                    {formatNumberWithLeadingZeros(
                    parseFloat(baseTokenCirculatingSupply), 
                    3,
                    baseTokenDecimals
                    )}
                  </Value>
                </div>
                <div>
                  <Label>Max Supply {formatTokenName(baseToken)}</Label>
                  <Value>
                    {formatNumberWithLeadingZeros(
                    parseFloat(baseTokenMaxsupply), 
                    3,
                    baseTokenDecimals
                    )}
                  </Value>
                </div>
              </Line>
            </div>
          </FieldSet>
        </div>
        <OrderBookComp num={6} />
      </TopRow>
      <TopRow>
        <TradeHistory num={10} />
        <PersonalTradeHistory />
        <PersonalOpenOrders />
        <HoldersList />
      </TopRow>
    </PageLayout>
  );
}
