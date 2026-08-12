import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  FieldSet,
  Select,
  FormField,
 } from 'nexus-module';
import { fetchVolumeData } from 'actions/fetchVolumeData';
import { setTimeSpan } from 'actions/actionCreators';
import {
  TopRow,
  PageLayout,
  Line,
  Value,
  Label,
  formatTokenName,
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
  const [mcap, setMcap] = useState(0);

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

  // Define updateData function at the component level
  const updateData = (executedOrders) => {
    if (
      executedOrders &&
      (executedOrders.bids?.length > 0 || executedOrders.asks?.length > 0)
    ) {
      const volumeData = fetchVolumeData(executedOrders);
      setBaseTokenVolume(volumeData.baseTokenVolume.toFixed(Math.min(3, baseTokenDecimals)));
      setQuoteTokenVolume(volumeData.quoteTokenVolume.toFixed(Math.min(3, quoteTokenDecimals)));

      const sortedExecutedOrders = [
        ...(executedOrders.bids || []),
        ...(executedOrders.asks || []),
      ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Newest first, so [0] is the latest trade and the last entry the oldest
      const newestPrice = sortedExecutedOrders[0]?.price;
      const oldestPrice = sortedExecutedOrders[sortedExecutedOrders.length - 1]?.price;

      setLastPrice(newestPrice ?? 'N/A');

      const prices = sortedExecutedOrders
        .map((order) => parseFloat(order.price))
        .filter((price) => Number.isFinite(price));

      setHigh(
        prices.length
          ? Math.max(...prices).toFixed(Math.min(8, quoteTokenDecimals))
          : 0
      );
      setLow(
        prices.length
          ? Math.min(...prices).toFixed(Math.min(8, quoteTokenDecimals))
          : 0
      );

      // Use the freshly computed price: `lastPrice` from state is still the
      // previous render's value at this point, so the change was one tick stale.
      if (Number.isFinite(parseFloat(newestPrice)) && parseFloat(oldestPrice)) {
        setChange(
          (((parseFloat(newestPrice) - parseFloat(oldestPrice)) / parseFloat(oldestPrice)) * 100).toFixed(1)
        );
      } else {
        setChange(0);
      }

    } else {
      setBaseTokenVolume(0);
      setQuoteTokenVolume(0);
      setLastPrice('N/A');
      setHigh(0);
      setLow(0);
      setChange(0);
    }

  };

  useEffect(() => {
    setMcap((lastPrice * baseTokenCirculatingSupply).toFixed(Math.min(2, quoteTokenDecimals)));
  }, [lastPrice, baseTokenCirculatingSupply]);

  useEffect(() => {

    // Fetch data immediately
    updateData(executedOrders);

    /*// Fetch data every 5 seconds
    const intervalId = setInterval(updateData, 5000);
  
    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
*/
  }, [marketPair, executedOrders]);

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
        <HoldersList num={10} />
      </TopRow>
    </PageLayout>
  );
}
