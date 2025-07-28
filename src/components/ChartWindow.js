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
      let price = 0;
      if (trade.order && trade.contract) {
        // Convert amounts from divisible units ONLY for NXS tokens
        // Other tokens are already in correct format
        let orderAmount = parseFloat(trade.order.amount);
        let contractAmount = parseFloat(trade.contract.amount);
        
        // Apply decimal conversion only for NXS tokens
        if (quoteToken === 'NXS') {
          orderAmount = orderAmount / Math.pow(10, quoteTokenDecimals || 6);
        }
        if (baseToken === 'NXS') {
          contractAmount = contractAmount / Math.pow(10, baseTokenDecimals || 6);
        }
        
        if (orderAmount > 0 && contractAmount > 0) {
          // Always calculate price as: quote_token_amount / base_token_amount
          // This gives us the price of 1 base token in terms of quote tokens
          
          if (trade.type === 'bid') {
            // Bid: user is buying base token with quote token
            // order.amount = quote token amount (what user pays)
            // contract.amount = base token amount (what user gets)
            price = orderAmount / contractAmount;
          } else if (trade.type === 'ask') {
            // Ask: user is selling base token for quote token
            // order.amount = base token amount (what user sells)
            // contract.amount = quote token amount (what user gets)
            price = contractAmount / orderAmount;
          } else {
            // Fallback: assume order.amount is always the "paying" amount
            // and contract.amount is the "receiving" amount
            // We need to figure out which is quote and which is base
            // For now, assume the first amount is quote, second is base
            price = orderAmount / contractAmount;
          }
        }
      }
      
      return {
        ...trade,
        price: price > 0 ? price : 0, // Using our calculated price, ignoring trade.price due to blockchain bug
        // Volume in quote token (convert only if NXS)
        volume: trade.type === 'bid' 
          ? (quoteToken === 'NXS' 
              ? parseFloat(trade.order?.amount || 0) / Math.pow(10, quoteTokenDecimals || 6)
              : parseFloat(trade.order?.amount || 0))
          : (baseToken === 'NXS' 
              ? parseFloat(trade.contract?.amount || 0) / Math.pow(10, baseTokenDecimals || 6)
              : parseFloat(trade.contract?.amount || 0))
      };
    }).filter(trade => trade.price > 0);

    if (tradesWithPrice.length === 0) {
      return { candlestickData: [], volumeData: [] };
    }

    // Debug: log a sample of trade data
    if (tradesWithPrice.length > 0) {
      console.log('Sample trade data (NXS conversion applied):', {
        marketPair,
        tokens: { baseToken, quoteToken },
        nxsConversion: {
          quoteIsNXS: quoteToken === 'NXS',
          baseIsNXS: baseToken === 'NXS'
        },
        rawTradeStructure: {
          sampleRawTrade: historicalData[0],
          hasOrderAmount: !!historicalData[0]?.order?.amount,
          hasContractAmount: !!historicalData[0]?.contract?.amount,
          tradeType: historicalData[0]?.type
        },
        first: {
          type: tradesWithPrice[0].type,
          rawOrderAmount: tradesWithPrice[0].order?.amount,
          rawContractAmount: tradesWithPrice[0].contract?.amount,
          convertedPrice: tradesWithPrice[0].price,
          convertedVolume: tradesWithPrice[0].volume
        },
        last: {
          type: tradesWithPrice[tradesWithPrice.length - 1].type,
          rawOrderAmount: tradesWithPrice[tradesWithPrice.length - 1].order?.amount,
          rawContractAmount: tradesWithPrice[tradesWithPrice.length - 1].contract?.amount,
          convertedPrice: tradesWithPrice[tradesWithPrice.length - 1].price,
          convertedVolume: tradesWithPrice[tradesWithPrice.length - 1].volume
        },
        count: tradesWithPrice.length
      });
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
          color: close >= open ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
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
          color: 'rgba(107, 114, 128, 0.2)'
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
        background: { type: ColorType.Solid, color: '#0d1421' },
        textColor: '#d1d5db',
        fontSize: 12,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      },
      grid: {
        vertLines: { 
          color: 'rgba(42, 46, 57, 0.5)',
          style: 2,
        },
        horzLines: { 
          color: 'rgba(42, 46, 57, 0.5)',
          style: 2,
        },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: 'rgba(224, 227, 235, 0.5)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1f2937',
        },
        horzLine: {
          color: 'rgba(224, 227, 235, 0.5)',
          width: 1,
          style: 3,
          labelBackgroundColor: '#1f2937',
        },
      },
      rightPriceScale: {
        borderColor: '#374151',
        textColor: '#9ca3af',
        entireTextOnly: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      timeScale: {
        borderColor: '#374151',
        textColor: '#9ca3af',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
        borderVisible: true,
        rightOffset: 12,
        barSpacing: 6,
        minBarSpacing: 3,
        tickMarkFormatter: (time) => {
          const date = new Date(time * 1000);
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        },
      },
      watermark: {
        visible: true,
        fontSize: 32,
        horzAlign: 'center',
        vertAlign: 'center',
        color: 'rgba(59, 130, 246, 0.1)',
        text: `${formatTokenName(baseToken)}/${formatTokenName(quoteToken)}`,
      },
      handleScroll: true,
      handleScale: true,
    });

    // Add candlestick series
    const candlesticks = newChart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderDownColor: '#ef4444',
      borderUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      borderVisible: true,
      wickVisible: true,
      priceFormat: {
        type: 'price',
        precision: quoteTokenDecimals || 6,
        minMove: 1 / Math.pow(10, quoteTokenDecimals || 6),
      },
    });

    // Add volume series
    const volume = newChart.addHistogramSeries({
      color: 'rgba(34, 197, 94, 0.4)',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
      lastValueVisible: false,
      priceLineVisible: false,
    });

    newChart.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.7,
        bottom: 0,
      },
      textColor: '#6b7280',
      borderColor: '#374151',
    });

    setChart(newChart);
    setCandlestickSeries(candlesticks);
    setVolumeSeries(volume);

    // Add resize handling
    const resizeObserver = new ResizeObserver(entries => {
      if (entries.length === 0) return;
      const entry = entries[0];
      const { width, height } = entry.contentRect;
      
      // Only resize if we have valid dimensions
      if (width > 0 && height > 0) {
        newChart.applyOptions({
          width: Math.floor(width),
          height: Math.floor(height)
        });
      }
    });
    
    resizeObserver.observe(chartContainer);

    return () => {
      resizeObserver.disconnect();
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

  const formatTokenName = (token) => {
    if (typeof token === 'string' && token.length > 20) {
      return token.slice(0, 4) + '...' + token.slice(-4);
    }
    return token;
  };

  const hasData = chartData.candlestickData.length > 0;
  const latestPrice = hasData ? chartData.candlestickData[chartData.candlestickData.length - 1].close : 0;
  
  // Calculate 24h volume (sum of last day's volume)
  const last24hVolume = hasData && chartData.volumeData.length > 0 
    ? chartData.volumeData[chartData.volumeData.length - 1]?.value || 0
    : 0;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <FieldSet legend={`${formatTokenName(baseToken)}/${formatTokenName(quoteToken)} Trading Chart`}>
        <div style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '12px 16px',
          backgroundColor: '#1f2937',
          borderRadius: '8px',
          border: '1px solid #374151'
        }}>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>LAST PRICE</span>
              <span style={{ 
                color: hasData ? '#22c55e' : '#6b7280', 
                fontSize: '20px', 
                fontWeight: '600',
                fontFamily: 'monospace'
              }}>
                {hasData ? formatNumberWithLeadingZeros(latestPrice, 6, quoteTokenDecimals) : '---'} 
                <span style={{ fontSize: '14px', marginLeft: '4px' }}>{formatTokenName(quoteToken)}</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>24H VOLUME</span>
              <span style={{ color: '#d1d5db', fontSize: '16px', fontWeight: '500' }}>
                {last24hVolume > 0 ? 
                  formatNumberWithLeadingZeros(last24hVolume, 2, quoteTokenDecimals) : '0'
                } {formatTokenName(quoteToken)}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>PERIOD</span>
              <span style={{ color: '#d1d5db', fontSize: '16px', fontWeight: '500' }}>
                {chartData.candlestickData.length} Days
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>TOTAL TRADES</span>
              <span style={{ color: '#d1d5db', fontSize: '16px', fontWeight: '500' }}>
                {historicalData.length.toLocaleString()}
              </span>
            </div>
          </div>
          {loading && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              color: '#3b82f6',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid #1f2937',
                borderTop: '2px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              Loading chart data...
            </div>
          )}
        </div>
        
        <div 
          ref={setChartContainer}
          style={{ 
            width: '100%', 
            height: '600px',
            border: '1px solid #374151',
            borderRadius: '12px',
            backgroundColor: '#0d1421',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}
        >
          {!hasData && !loading && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
              color: '#6b7280',
              fontSize: '16px',
              gap: '12px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                📊
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>No Trading Data Available</div>
                <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                  No trades found for {formatTokenName(baseToken)}/{formatTokenName(quoteToken)} in the past year
                </div>
              </div>
            </div>
          )}
        </div>
        
        {hasData && (
          <div style={{ 
            marginTop: '16px', 
            padding: '12px 16px',
            backgroundColor: '#111827',
            borderRadius: '8px',
            border: '1px solid #374151'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              fontSize: '13px', 
              color: '#9ca3af' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '50%' }} />
                Daily candlesticks for the past 365 days
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
                Green/Red indicates price increase/decrease
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: 'rgba(34, 197, 94, 0.6)', borderRadius: '50%' }} />
                Volume displayed at chart bottom
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#6b7280', borderRadius: '50%' }} />
                Scroll and zoom to explore data
              </div>
            </div>
          </div>
        )}
      </FieldSet>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChartWindow;