import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { FieldSet, apiCall } from 'nexus-module';
import { createChart, ColorType } from 'lightweight-charts';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';

const ChartWindow = () => {
  const [chartContainer, setChartContainer] = useState(null);
  const [chart, setChart] = useState(null);
  const [candlestickSeries, setCandlestickSeries] = useState(null);
  const [volumeSeries, setVolumeSeries] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Get data from Redux store
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);

  // Fetch 1 year of historical data
  const fetchHistoricalData = async () => {
    if (!marketPair) return;
    
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const oneYearAgo = now - (365 * 24 * 60 * 60); // 1 year ago
      
      const executed = await apiCall('market/list/executed', {
        market: marketPair,
        sort: 'timestamp',
        order: 'asc',
        limit: 10000, // Large limit to get all trades in the year
        where: `results.timestamp>${oneYearAgo}`
      }).catch(() => ({}));

      if (executed && typeof executed === 'object') {
        const bids = Array.isArray(executed.bids) ? executed.bids : [];
        const asks = Array.isArray(executed.asks) ? executed.asks : [];
        const allTrades = [...bids, ...asks];
        setHistoricalData(allTrades);
      } else {
        setHistoricalData([]);
      }
    } catch (error) {
      //console.error('Error fetching historical data:', error);
      setHistoricalData([]);
    }
    setLoading(false);
  };

  // Fetch data when market pair changes
  useEffect(() => {
    fetchHistoricalData();
  }, [marketPair]);

  // Process trading data into daily OHLC format
  const chartData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return { candlestickData: [], volumeData: [] };
    }

    // Calculate price for each trade
    const tradesWithPrice = historicalData.map(trade => {
      let price;
      if (trade.order && trade.contract) {
        // Determine if this is a bid or ask based on the data structure
        const isBid = trade.order.amount && trade.contract.amount;
        if (isBid) {
          price = (parseFloat(trade.contract.amount) / parseFloat(trade.order.amount)) / Math.pow(10, quoteTokenDecimals || 6);
        } else {
          price = (parseFloat(trade.order.amount) / parseFloat(trade.contract.amount)) / Math.pow(10, quoteTokenDecimals || 6);
        }
      } else {
        price = 0;
      }
      return {
        ...trade,
        price,
        volume: parseFloat(trade.contract?.amount || 0)
      };
    }).filter(trade => trade.price > 0);

    if (tradesWithPrice.length === 0) {
      return { candlestickData: [], volumeData: [] };
    }

    // Sort by timestamp
    tradesWithPrice.sort((a, b) => a.timestamp - b.timestamp);

    // Group trades by day intervals
    const intervalMs = 24 * 60 * 60; // 1 day in seconds
    const groupedTrades = {};

    tradesWithPrice.forEach(trade => {
      const dayStart = Math.floor(trade.timestamp / intervalMs) * intervalMs;
      if (!groupedTrades[dayStart]) {
        groupedTrades[dayStart] = [];
      }
      groupedTrades[dayStart].push(trade);
    });

    const candlestickData = [];
    const volumeData = [];

    // Generate data for each day in the past year, even if no trades
    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - (365 * 24 * 60 * 60);
    let lastClose = null;

    for (let dayStart = Math.floor(oneYearAgo / intervalMs) * intervalMs; dayStart <= now; dayStart += intervalMs) {
      const trades = groupedTrades[dayStart] || [];
      
      if (trades.length > 0) {
        const prices = trades.map(trade => trade.price);
        const volumes = trades.map(trade => trade.volume);
        
        const open = trades[0].price;
        const close = trades[trades.length - 1].price;
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const volume = volumes.reduce((sum, vol) => sum + vol, 0);

        candlestickData.push({
          time: dayStart,
          open,
          high,
          low,
          close
        });

        volumeData.push({
          time: dayStart,
          value: volume,
          color: close >= open ? 'rgba(0, 150, 136, 0.8)' : 'rgba(255, 82, 82, 0.8)'
        });

        lastClose = close;
      } else if (lastClose !== null) {
        // No trades this day, use previous close for all OHLC values
        candlestickData.push({
          time: dayStart,
          open: lastClose,
          high: lastClose,
          low: lastClose,
          close: lastClose
        });

        volumeData.push({
          time: dayStart,
          value: 0,
          color: 'rgba(128, 128, 128, 0.3)'
        });
      }
    }

    return { candlestickData, volumeData };
  }, [historicalData, quoteTokenDecimals]);

  // Initialize chart
  useEffect(() => {
    if (!chartContainer) return;

    const newChart = createChart(chartContainer, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#485c7b',
      },
      timeScale: {
        borderColor: '#485c7b',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      watermark: {
        visible: true,
        fontSize: 24,
        horzAlign: 'center',
        vertAlign: 'center',
        color: 'rgba(171, 71, 188, 0.3)',
        text: `${marketPair || 'DEX Chart'} - 1 Year Daily`,
      },
    });

    // Add candlestick series
    const candlesticks = newChart.addCandlestickSeries({
      upColor: '#00e676',
      downColor: '#ff5252',
      borderDownColor: '#ff5252',
      borderUpColor: '#00e676',
      wickDownColor: '#ff5252',
      wickUpColor: '#00e676',
    });

    // Add volume series
    const volume = newChart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    newChart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    setChart(newChart);
    setCandlestickSeries(candlesticks);
    setVolumeSeries(volume);

    return () => {
      newChart.remove();
    };
  }, [chartContainer, marketPair]);

  // Update chart data
  useEffect(() => {
    if (!candlestickSeries || !volumeSeries) return;

    if (chartData.candlestickData.length > 0) {
      candlestickSeries.setData(chartData.candlestickData);
      volumeSeries.setData(chartData.volumeData);
      
      // Set visible range to show the full year
      const timeScale = chart?.timeScale();
      if (timeScale && chartData.candlestickData.length > 0) {
        const firstTime = chartData.candlestickData[0].time;
        const lastTime = chartData.candlestickData[chartData.candlestickData.length - 1].time;
        timeScale.setVisibleRange({
          from: firstTime,
          to: lastTime
        });
      }
    }
  }, [candlestickSeries, volumeSeries, chartData, chart]);

  // Handle chart container resize
  useEffect(() => {
    if (!chart || !chartContainer) return;

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
      });
    });

    resizeObserver.observe(chartContainer);

    return () => {
      resizeObserver.disconnect();
    };
  }, [chart, chartContainer]);

  const formatTokenName = (token) => {
    if (typeof token === 'string' && token.length > 20) {
      return token.slice(0, 4) + '...' + token.slice(-4);
    }
    return token;
  };

  const hasData = chartData.candlestickData.length > 0;
  const latestPrice = hasData ? chartData.candlestickData[chartData.candlestickData.length - 1].close : 0;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <FieldSet legend={`${formatTokenName(baseToken)}/${formatTokenName(quoteToken)} - 1 Year Daily Chart`}>
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div>
              <span style={{ color: '#d1d4dc', fontWeight: 'bold' }}>Price: </span>
              <span style={{ color: '#00e676', fontSize: '18px' }}>
                {hasData ? formatNumberWithLeadingZeros(latestPrice, 6, quoteTokenDecimals) : 'N/A'} {formatTokenName(quoteToken)}
              </span>
            </div>
            <div>
              <span style={{ color: '#d1d4dc', fontWeight: 'bold' }}>Days: </span>
              <span style={{ color: '#d1d4dc' }}>{chartData.candlestickData.length}</span>
            </div>
            <div>
              <span style={{ color: '#d1d4dc', fontWeight: 'bold' }}>Trades: </span>
              <span style={{ color: '#d1d4dc' }}>{historicalData.length}</span>
            </div>
          </div>
          {loading && (
            <div style={{ color: '#d1d4dc' }}>Loading...</div>
          )}
        </div>
        
        <div 
          ref={setChartContainer}
          style={{ 
            width: '100%', 
            height: '500px',
            border: '1px solid #485c7b',
            borderRadius: '4px',
            backgroundColor: '#1a1a1a'
          }}
        >
          {!hasData && !loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#d1d4dc',
              fontSize: '16px'
            }}>
              No trading data available for {marketPair} in the past year
            </div>
          )}
        </div>
        
        {hasData && (
          <div style={{ marginTop: '12px', fontSize: '12px', color: '#888' }}>
            <p>• Chart shows daily candlesticks for the past 365 days</p>
            <p>• Green bars indicate price increase, red bars indicate price decrease</p>
            <p>• Volume is displayed at the bottom of the chart</p>
            <p>• Days without trades show flat lines using the previous day's closing price</p>
          </div>
        )}
      </FieldSet>
    </div>
  );
};

export default ChartWindow;