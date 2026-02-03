import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { FieldSet, apiCall } from 'nexus-module';
import { createChart, ColorType } from 'lightweight-charts';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';

// Time range options in seconds
const TIME_RANGES = {
  '1w': 7 * 24 * 60 * 60,
  '1m': 30 * 24 * 60 * 60,
  '1y': 365 * 24 * 60 * 60,
  '5y': 5 * 365 * 24 * 60 * 60,
};

// Candlestick interval options in seconds
const INTERVAL_OPTIONS = {
  '1h': 60 * 60,
  '6h': 6 * 60 * 60,
  '12h': 12 * 60 * 60,
  '1d': 24 * 60 * 60,
  '1w': 7 * 24 * 60 * 60,
};

// Available intervals for each time range
const INTERVALS_BY_RANGE = {
  '1w': ['1h', '6h', '12h'],
  '1m': ['6h', '12h', '1d'],
  '1y': ['12h', '1d'],
  '5y': ['1d', '1w'],
};

// Default interval for each time range
const DEFAULT_INTERVAL_BY_RANGE = {
  '1w': '6h',
  '1m': '1d',
  '1y': '1d',
  '5y': '1w',
};

// Chart types
const CHART_TYPES = ['candle', 'line', 'area'];

// Available technical indicators
const INDICATORS = {
  sma20: { name: 'SMA 20', color: '#f59e0b', period: 20 },
  sma50: { name: 'SMA 50', color: '#3b82f6', period: 50 },
  ema20: { name: 'EMA 20', color: '#8b5cf6', period: 20 },
  bb: { name: 'Bollinger Bands', color: '#6366f1', period: 20, stdDev: 2 },
};

// Calculate Simple Moving Average
const calculateSMA = (data, period) => {
  const result = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({
      time: data[i].time,
      value: sum / period,
    });
  }
  return result;
};

// Calculate Exponential Moving Average
const calculateEMA = (data, period) => {
  const result = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  let ema = sum / period;
  result.push({ time: data[period - 1].time, value: ema });
  
  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    ema = (data[i].close - ema) * multiplier + ema;
    result.push({ time: data[i].time, value: ema });
  }
  return result;
};

// Calculate Bollinger Bands
const calculateBollingerBands = (data, period, stdDev) => {
  const sma = calculateSMA(data, period);
  const upper = [];
  const lower = [];
  
  for (let i = 0; i < sma.length; i++) {
    const dataIndex = i + period - 1;
    let sumSquares = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[dataIndex - j].close - sma[i].value;
      sumSquares += diff * diff;
    }
    const std = Math.sqrt(sumSquares / period);
    upper.push({ time: sma[i].time, value: sma[i].value + stdDev * std });
    lower.push({ time: sma[i].time, value: sma[i].value - stdDev * std });
  }
  
  return { middle: sma, upper, lower };
};

// Drawing tool types
const DRAWING_TOOLS = {
  none: { name: 'Select', icon: '🖱️' },
  hline: { name: 'H-Line', icon: '─', color: '#f59e0b' },
  trendline: { name: 'Trend', icon: '╱', color: '#3b82f6' },
  ray: { name: 'Ray', icon: '→', color: '#8b5cf6' },
  fib: { name: 'Fib', icon: '🔢', color: '#ec4899' },
};

// Fibonacci levels
const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// Helper function to get clock-aligned interval start time
const getAlignedIntervalStart = (timestamp, intervalKey) => {
  const date = new Date(timestamp * 1000);
  
  switch (intervalKey) {
    case '1h': {
      // Align to hour (x:00)
      date.setMinutes(0, 0, 0);
      return Math.floor(date.getTime() / 1000);
    }
    
    case '6h': {
      // Align to 6-hour blocks (00:00, 06:00, 12:00, 18:00)
      const hour6 = Math.floor(date.getHours() / 6) * 6;
      date.setHours(hour6, 0, 0, 0);
      return Math.floor(date.getTime() / 1000);
    }
    
    case '12h': {
      // Align to 12-hour blocks (00:00, 12:00)
      const hour12 = Math.floor(date.getHours() / 12) * 12;
      date.setHours(hour12, 0, 0, 0);
      return Math.floor(date.getTime() / 1000);
    }
    
    case '1d': {
      // Align to day start (00:00)
      date.setHours(0, 0, 0, 0);
      return Math.floor(date.getTime() / 1000);
    }
    
    case '1w': {
      // Align to Monday 00:00
      date.setHours(0, 0, 0, 0);
      const dayOfWeek = date.getDay();
      // Adjust to Monday (day 1), handle Sunday (day 0) as 7 days back
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      date.setDate(date.getDate() - daysToSubtract);
      return Math.floor(date.getTime() / 1000);
    }
    
    default:
      return timestamp;
  }
};

const ChartWindow = () => {
  const [chartContainer, setChartContainer] = useState(null);
  const [chart, setChart] = useState(null);
  const [mainSeries, setMainSeries] = useState(null);
  const [volumeSeries, setVolumeSeries] = useState(null);
  const [indicatorSeries, setIndicatorSeries] = useState({});
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isLogarithmic, setIsLogarithmic] = useState(false);
  const [selectedRange, setSelectedRange] = useState('1y');
  const [selectedInterval, setSelectedInterval] = useState('1d');
  const [chartType, setChartType] = useState('candle');
  const [activeIndicators, setActiveIndicators] = useState([]);
  
  // Drawing state
  const [drawingTool, setDrawingTool] = useState('none');
  const [drawings, setDrawings] = useState([]);
  const [drawingSeries, setDrawingSeries] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingStart, setDrawingStart] = useState(null);
  const drawingIdRef = useRef(0);

  // Update interval when range changes to ensure valid combination
  useEffect(() => {
    const validIntervals = INTERVALS_BY_RANGE[selectedRange] || ['1d'];
    if (!validIntervals.includes(selectedInterval)) {
      setSelectedInterval(DEFAULT_INTERVAL_BY_RANGE[selectedRange] || '1d');
    }
  }, [selectedRange]);
  
  // Get data from Redux store
  const marketPair = useSelector((state) => state.ui.market.marketPairs.marketPair);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);

  // Fetch historical data
  const fetchHistoricalData = async () => {
    if (!marketPair || typeof marketPair !== 'string') {
      setHistoricalData([]);
      return;
    }
    
    setLoading(true);
    try {
      const now = Math.floor(Date.now() / 1000);
      const fiveYearsAgo = now - (5 * 365 * 24 * 60 * 60); // 5 years ago to support all ranges
      
      const executed = await apiCall('market/list/executed/timestamp,type,contract.amount,contract.ticker,order.amount,order.ticker', {
        market: marketPair,
        sort: 'timestamp',
        order: 'asc',
        limit: 10000, // Large limit to get all trades
        where: `results.timestamp>${fiveYearsAgo}`
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

  // Process trading data into OHLC format
  const chartData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return { candlestickData: [], volumeData: [] };
    }

    // Calculate price for each trade
    // IMPORTANT: Never use trade.price field due to Nexus core bug
    // Price must be calculated from contract.amount and order.amount
    // NXS amounts are always given in divisible units (actual_amount * 1e6)
    const tradesWithPrice = historicalData.map(trade => {
      let price = 0;
      let volume = 0;
      
      if (trade.order && trade.contract) {
        // Get raw amounts
        let orderAmount = parseFloat(trade.order.amount);
        let contractAmount = parseFloat(trade.contract.amount);

        // Convert NXS from divisible units (NXS is stored as amount * 1e6)
        if (trade.order.ticker === 'NXS') {
          orderAmount = orderAmount / 1e6;
        }
        if (trade.contract.ticker === 'NXS') {
          contractAmount = contractAmount / 1e6;
        }
        
        if (orderAmount > 0 && contractAmount > 0) {
          // Calculate price as: quote_token_amount / base_token_amount
          // This gives us the price of 1 base token in terms of quote tokens
          
          if (trade.type === 'bid') {
            // Bid: user is buying base token with quote token
            // contract.amount = quote token amount (what user pays)
            // order.amount = base token amount (what user gets)
            price = contractAmount / orderAmount;
            volume = contractAmount; // Volume in quote token
          } else if (trade.type === 'ask') {
            // Ask: user is selling base token for quote token
            // contract.amount = base token amount (what user sells)
            // order.amount = quote token amount (what user gets)
            price = orderAmount / contractAmount;
            volume = orderAmount; // Volume in quote token
          }
        }
      }
      
      return {
        ...trade,
        calculatedPrice: price > 0 ? price : 0,
        calculatedVolume: volume
      };
    }).filter(trade => trade.calculatedPrice > 0);

    if (tradesWithPrice.length === 0) {
      return { candlestickData: [], volumeData: [] };
    }

    // Debug: log a sample of trade data
    if (tradesWithPrice.length > 0) {
      console.log('Sample trade data (NXS conversion applied):', {
        marketPair,
        tokens: { baseToken, quoteToken },
        first: {
          type: tradesWithPrice[0].type,
          calculatedPrice: tradesWithPrice[0].calculatedPrice,
          calculatedVolume: tradesWithPrice[0].calculatedVolume
        },
        last: {
          type: tradesWithPrice[tradesWithPrice.length - 1].type,
          calculatedPrice: tradesWithPrice[tradesWithPrice.length - 1].calculatedPrice,
          calculatedVolume: tradesWithPrice[tradesWithPrice.length - 1].calculatedVolume
        },
        count: tradesWithPrice.length
      });
    }

    // Sort by timestamp
    tradesWithPrice.sort((a, b) => a.timestamp - b.timestamp);

    // Group trades by selected interval with clock-aligned times
    const intervalSeconds = INTERVAL_OPTIONS[selectedInterval] || INTERVAL_OPTIONS['1d'];
    const groupedTrades = {};

    tradesWithPrice.forEach(trade => {
      const intervalStart = getAlignedIntervalStart(trade.timestamp, selectedInterval);
      if (!groupedTrades[intervalStart]) {
        groupedTrades[intervalStart] = [];
      }
      groupedTrades[intervalStart].push(trade);
    });

    const candlestickData = [];
    const volumeData = [];

    // Generate data for each interval in the data range
    const now = Math.floor(Date.now() / 1000);
    const dataRangeStart = now - TIME_RANGES['5y']; // Use 5y to have all data available
    const alignedStart = getAlignedIntervalStart(dataRangeStart, selectedInterval);
    let lastClose = null;

    for (let intervalStart = alignedStart; intervalStart <= now; intervalStart += intervalSeconds) {
      const trades = groupedTrades[intervalStart] || [];
      
      if (trades.length > 0) {
        const prices = trades.map(trade => trade.calculatedPrice);
        const volumes = trades.map(trade => trade.calculatedVolume);
        
        const open = trades[0].calculatedPrice;
        const close = trades[trades.length - 1].calculatedPrice;
        const high = Math.max(...prices);
        const low = Math.min(...prices);
        const volume = volumes.reduce((sum, vol) => sum + vol, 0);

        candlestickData.push({
          time: intervalStart,
          open,
          high,
          low,
          close
        });

        volumeData.push({
          time: intervalStart,
          value: volume,
          color: close >= open ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        });

        lastClose = close;
      } else if (lastClose !== null) {
        // No trades this interval, use previous close for all OHLC values
        candlestickData.push({
          time: intervalStart,
          open: lastClose,
          high: lastClose,
          low: lastClose,
          close: lastClose
        });

        volumeData.push({
          time: intervalStart,
          value: 0,
          color: 'rgba(107, 114, 128, 0.2)'
        });
      }
    }

    return { candlestickData, volumeData };
  }, [historicalData, quoteTokenDecimals, selectedInterval]);

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
        mode: 0, // Start with linear mode, will be updated by separate useEffect
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        minimumWidth: 80,
        autoScale: true,
        invertScale: false,
        alignLabels: true,
        borderVisible: true,
        drawTicks: true,
        visible: true,
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
    setMainSeries(candlesticks);
    setVolumeSeries(volume);
    setIndicatorSeries({});

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

  // Update logarithmic mode separately to avoid recreating the chart
  useEffect(() => {
    if (!chart) return;
    
    const rightPriceScale = chart.priceScale('right');
    if (rightPriceScale) {
      rightPriceScale.applyOptions({
        mode: isLogarithmic ? 1 : 0, // 0 = normal, 1 = logarithmic
      });
    }
  }, [chart, isLogarithmic]);

  // Handle chart type changes
  useEffect(() => {
    if (!chart || !mainSeries) return;
    
    // Remove existing main series
    chart.removeSeries(mainSeries);
    
    // Remove existing indicator series
    Object.values(indicatorSeries).forEach(series => {
      if (Array.isArray(series)) {
        series.forEach(s => chart.removeSeries(s));
      } else {
        chart.removeSeries(series);
      }
    });
    
    const priceFormatOptions = {
      type: 'price',
      precision: quoteTokenDecimals || 6,
      minMove: 1 / Math.pow(10, quoteTokenDecimals || 6),
    };
    
    let newSeries;
    
    switch (chartType) {
      case 'line': {
        newSeries = chart.addLineSeries({
          color: '#3b82f6',
          lineWidth: 2,
          priceFormat: priceFormatOptions,
          lastValueVisible: true,
          priceLineVisible: true,
        });
        break;
      }
      case 'area': {
        newSeries = chart.addAreaSeries({
          topColor: 'rgba(59, 130, 246, 0.4)',
          bottomColor: 'rgba(59, 130, 246, 0.0)',
          lineColor: '#3b82f6',
          lineWidth: 2,
          priceFormat: priceFormatOptions,
          lastValueVisible: true,
          priceLineVisible: true,
        });
        break;
      }
      case 'candle':
      default: {
        newSeries = chart.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderDownColor: '#ef4444',
          borderUpColor: '#22c55e',
          wickDownColor: '#ef4444',
          wickUpColor: '#22c55e',
          borderVisible: true,
          wickVisible: true,
          priceFormat: priceFormatOptions,
        });
        break;
      }
    }
    
    setMainSeries(newSeries);
    setIndicatorSeries({});
    setActiveIndicators([]);
  }, [chart, chartType]);

  // Update chart data
  useEffect(() => {
    if (!mainSeries || !volumeSeries) return;

    if (chartData.candlestickData.length > 0) {
      // For line/area charts, convert OHLC to simple value data
      if (chartType === 'line' || chartType === 'area') {
        const lineData = chartData.candlestickData.map(d => ({
          time: d.time,
          value: d.close,
        }));
        mainSeries.setData(lineData);
      } else {
        mainSeries.setData(chartData.candlestickData);
      }
      volumeSeries.setData(chartData.volumeData);
    }
  }, [mainSeries, volumeSeries, chartData, chartType]);

  // Update indicators when data or active indicators change
  useEffect(() => {
    if (!chart || !chartData.candlestickData.length) return;
    
    // Remove old indicator series
    Object.values(indicatorSeries).forEach(series => {
      if (Array.isArray(series)) {
        series.forEach(s => {
          try { chart.removeSeries(s); } catch (e) {}
        });
      } else {
        try { chart.removeSeries(series); } catch (e) {}
      }
    });
    
    const newIndicatorSeries = {};
    
    activeIndicators.forEach(indicatorKey => {
      const indicator = INDICATORS[indicatorKey];
      if (!indicator) return;
      
      switch (indicatorKey) {
        case 'sma20':
        case 'sma50': {
          const smaData = calculateSMA(chartData.candlestickData, indicator.period);
          const smaSeries = chart.addLineSeries({
            color: indicator.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          smaSeries.setData(smaData);
          newIndicatorSeries[indicatorKey] = smaSeries;
          break;
        }
        case 'ema20': {
          const emaData = calculateEMA(chartData.candlestickData, indicator.period);
          const emaSeries = chart.addLineSeries({
            color: indicator.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          emaSeries.setData(emaData);
          newIndicatorSeries[indicatorKey] = emaSeries;
          break;
        }
        case 'bb': {
          const bbData = calculateBollingerBands(chartData.candlestickData, indicator.period, indicator.stdDev);
          
          const upperSeries = chart.addLineSeries({
            color: indicator.color,
            lineWidth: 1,
            lineStyle: 2, // Dashed
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          upperSeries.setData(bbData.upper);
          
          const middleSeries = chart.addLineSeries({
            color: indicator.color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          middleSeries.setData(bbData.middle);
          
          const lowerSeries = chart.addLineSeries({
            color: indicator.color,
            lineWidth: 1,
            lineStyle: 2, // Dashed
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          lowerSeries.setData(bbData.lower);
          
          newIndicatorSeries[indicatorKey] = [upperSeries, middleSeries, lowerSeries];
          break;
        }
        default:
          break;
      }
    });
    
    setIndicatorSeries(newIndicatorSeries);
  }, [chart, chartData.candlestickData, activeIndicators]);

  // Render drawings on chart
  const renderDrawings = useCallback(() => {
    if (!chart || !mainSeries) return;
    
    // Remove old drawing series
    drawingSeries.forEach(series => {
      try { chart.removeSeries(series); } catch (e) {}
    });
    
    const newDrawingSeries = [];
    
    drawings.forEach(drawing => {
      switch (drawing.type) {
        case 'hline': {
          // Create horizontal line using a price line on the main series
          const priceLine = mainSeries.createPriceLine({
            price: drawing.price,
            color: DRAWING_TOOLS.hline.color,
            lineWidth: 1,
            lineStyle: 0, // Solid
            axisLabelVisible: true,
            title: '',
          });
          newDrawingSeries.push({ type: 'priceLine', line: priceLine, drawingId: drawing.id });
          break;
        }
        case 'trendline':
        case 'ray': {
          // Create trend line using line series
          const lineSeries = chart.addLineSeries({
            color: DRAWING_TOOLS[drawing.type].color,
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
          });
          
          // For ray, extend the line further
          let endTime = drawing.endTime;
          let endPrice = drawing.endPrice;
          
          if (drawing.type === 'ray' && drawing.startTime !== drawing.endTime) {
            const timeDiff = drawing.endTime - drawing.startTime;
            const priceDiff = drawing.endPrice - drawing.startPrice;
            const extension = 10; // Extend 10x the original length
            endTime = drawing.endTime + timeDiff * extension;
            endPrice = drawing.endPrice + priceDiff * extension;
          }
          
          lineSeries.setData([
            { time: drawing.startTime, value: drawing.startPrice },
            { time: endTime, value: endPrice },
          ]);
          newDrawingSeries.push({ type: 'series', series: lineSeries, drawingId: drawing.id });
          break;
        }
        case 'fib': {
          // Create Fibonacci retracement levels
          const fibSeries = [];
          const highPrice = Math.max(drawing.startPrice, drawing.endPrice);
          const lowPrice = Math.min(drawing.startPrice, drawing.endPrice);
          const priceRange = highPrice - lowPrice;
          
          FIB_LEVELS.forEach((level, index) => {
            const price = highPrice - priceRange * level;
            const priceLine = mainSeries.createPriceLine({
              price: price,
              color: DRAWING_TOOLS.fib.color,
              lineWidth: 1,
              lineStyle: level === 0 || level === 1 ? 0 : 2, // Solid for 0 and 1, dashed for others
              axisLabelVisible: true,
              title: `${(level * 100).toFixed(1)}%`,
            });
            fibSeries.push({ type: 'priceLine', line: priceLine, drawingId: drawing.id });
          });
          newDrawingSeries.push(...fibSeries);
          break;
        }
        default:
          break;
      }
    });
    
    setDrawingSeries(newDrawingSeries);
  }, [chart, mainSeries, drawings]);

  // Re-render drawings when they change
  useEffect(() => {
    renderDrawings();
  }, [drawings, renderDrawings]);

  // Handle chart click for drawing
  const handleChartClick = useCallback((param) => {
    if (drawingTool === 'none' || !param.time || !param.point) return;
    
    const price = mainSeries.coordinateToPrice(param.point.y);
    const time = param.time;
    
    if (drawingTool === 'hline') {
      // Single click for horizontal line
      const newDrawing = {
        id: ++drawingIdRef.current,
        type: 'hline',
        price: price,
        time: time,
      };
      setDrawings(prev => [...prev, newDrawing]);
      setDrawingTool('none'); // Reset after drawing
    } else if (drawingTool === 'trendline' || drawingTool === 'ray' || drawingTool === 'fib') {
      // Two-click drawing
      if (!isDrawing) {
        setIsDrawing(true);
        setDrawingStart({ time, price });
      } else {
        const newDrawing = {
          id: ++drawingIdRef.current,
          type: drawingTool,
          startTime: drawingStart.time,
          startPrice: drawingStart.price,
          endTime: time,
          endPrice: price,
        };
        setDrawings(prev => [...prev, newDrawing]);
        setIsDrawing(false);
        setDrawingStart(null);
        setDrawingTool('none'); // Reset after drawing
      }
    }
  }, [drawingTool, isDrawing, drawingStart, mainSeries]);

  // Subscribe to chart clicks
  useEffect(() => {
    if (!chart) return;
    
    chart.subscribeClick(handleChartClick);
    
    return () => {
      chart.unsubscribeClick(handleChartClick);
    };
  }, [chart, handleChartClick]);

  // Clear all drawings
  const clearDrawings = useCallback(() => {
    // Remove price lines from main series
    drawingSeries.forEach(item => {
      if (item.type === 'priceLine' && mainSeries) {
        try { mainSeries.removePriceLine(item.line); } catch (e) {}
      } else if (item.type === 'series' && chart) {
        try { chart.removeSeries(item.series); } catch (e) {}
      }
    });
    setDrawings([]);
    setDrawingSeries([]);
    setIsDrawing(false);
    setDrawingStart(null);
  }, [chart, mainSeries, drawingSeries]);

  // Cancel current drawing
  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawingStart(null);
    setDrawingTool('none');
  }, []);

  // Update visible range when selectedRange changes
  useEffect(() => {
    if (!chart || chartData.candlestickData.length === 0) return;

    const timeScale = chart.timeScale();
    const now = Math.floor(Date.now() / 1000);
    const rangeSeconds = TIME_RANGES[selectedRange] || TIME_RANGES['1y'];
    const rangeStart = now - rangeSeconds;
    
    // Find the actual data points within the range
    const lastTime = chartData.candlestickData[chartData.candlestickData.length - 1].time;
    const firstDataTime = chartData.candlestickData[0].time;
    
    // Use the later of rangeStart or first available data point
    const visibleFrom = Math.max(rangeStart, firstDataTime);
    
    timeScale.setVisibleRange({
      from: visibleFrom,
      to: lastTime
    });
  }, [chart, chartData, selectedRange]);

  const toggleScaleMode = () => {
    setIsLogarithmic(prev => !prev);
  };

  const toggleIndicator = (indicatorKey) => {
    setActiveIndicators(prev => 
      prev.includes(indicatorKey)
        ? prev.filter(k => k !== indicatorKey)
        : [...prev, indicatorKey]
    );
  };

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
                {hasData ? formatNumberWithLeadingZeros(latestPrice, 3, quoteTokenDecimals) : '---'} 
                <span style={{ fontSize: '14px', marginLeft: '4px' }}>{formatTokenName(quoteToken)}</span>
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>24H VOLUME</span>
              <span style={{ color: '#d1d5db', fontSize: '16px', fontWeight: '500' }}>
                {last24hVolume > 0 ? 
                  formatNumberWithLeadingZeros(last24hVolume, 3, quoteTokenDecimals) : '0'
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Time Range Selector */}
            <div style={{ display: 'flex', backgroundColor: '#374151', borderRadius: '6px', padding: '2px' }}>
              {Object.keys(TIME_RANGES).map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: selectedRange === range ? '#3b82f6' : 'transparent',
                    color: selectedRange === range ? '#ffffff' : '#9ca3af',
                  }}
                >
                  {range.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Candlestick Interval Selector */}
            <div style={{ display: 'flex', backgroundColor: '#374151', borderRadius: '6px', padding: '2px' }}>
              {(INTERVALS_BY_RANGE[selectedRange] || ['1d']).map((interval) => (
                <button
                  key={interval}
                  onClick={() => setSelectedInterval(interval)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: selectedInterval === interval ? '#10b981' : 'transparent',
                    color: selectedInterval === interval ? '#ffffff' : '#9ca3af',
                  }}
                >
                  {interval.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Scale Mode Selector */}
            <div style={{ display: 'flex', backgroundColor: '#374151', borderRadius: '6px', padding: '2px' }}>
              <button
                onClick={toggleScaleMode}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: !isLogarithmic ? '#3b82f6' : 'transparent',
                  color: !isLogarithmic ? '#ffffff' : '#9ca3af',
                }}
              >
                Linear
              </button>
              <button
                onClick={toggleScaleMode}
                style={{
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: isLogarithmic ? '#3b82f6' : 'transparent',
                  color: isLogarithmic ? '#ffffff' : '#9ca3af',
                }}
              >
                Log
              </button>
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
        </div>
        
        {/* Second row: Chart type and Indicators */}
        <div style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: '#1f2937',
          borderRadius: '8px',
          border: '1px solid #374151'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Chart Type Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>CHART</span>
              <div style={{ display: 'flex', backgroundColor: '#374151', borderRadius: '6px', padding: '2px' }}>
                {CHART_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: chartType === type ? '#3b82f6' : 'transparent',
                      color: chartType === type ? '#ffffff' : '#9ca3af',
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>INDICATORS</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Object.entries(INDICATORS).map(([key, indicator]) => (
                  <button
                    key={key}
                    onClick={() => toggleIndicator(key)}
                    style={{
                      padding: '6px 10px',
                      fontSize: '11px',
                      fontWeight: '500',
                      border: activeIndicators.includes(key) ? `1px solid ${indicator.color}` : '1px solid #374151',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: activeIndicators.includes(key) ? `${indicator.color}20` : '#374151',
                      color: activeIndicators.includes(key) ? indicator.color : '#9ca3af',
                    }}
                  >
                    {indicator.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Active indicators legend */}
          {activeIndicators.length > 0 && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {activeIndicators.map(key => {
                const indicator = INDICATORS[key];
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '2px', 
                      backgroundColor: indicator.color,
                      borderRadius: '1px'
                    }} />
                    <span style={{ color: indicator.color, fontSize: '11px' }}>{indicator.name}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Third row: Drawing Tools */}
        <div style={{ 
          marginBottom: '16px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          padding: '8px 16px',
          backgroundColor: '#1f2937',
          borderRadius: '8px',
          border: '1px solid #374151'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Drawing Tools */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '500' }}>DRAW</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {Object.entries(DRAWING_TOOLS).map(([key, tool]) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (isDrawing) cancelDrawing();
                      setDrawingTool(key === drawingTool ? 'none' : key);
                    }}
                    style={{
                      padding: '6px 10px',
                      fontSize: '12px',
                      fontWeight: '500',
                      border: drawingTool === key ? `1px solid ${tool.color || '#3b82f6'}` : '1px solid #374151',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      backgroundColor: drawingTool === key ? `${tool.color || '#3b82f6'}20` : '#374151',
                      color: drawingTool === key ? (tool.color || '#3b82f6') : '#9ca3af',
                    }}
                  >
                    <span style={{ marginRight: '4px' }}>{tool.icon}</span>
                    {tool.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Drawing status / instructions */}
            {isDrawing && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                color: '#f59e0b',
                fontSize: '12px'
              }}>
                <span>Click to set end point</span>
                <button
                  onClick={cancelDrawing}
                  style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Drawings count and clear button */}
            {drawings.length > 0 && (
              <>
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                  {drawings.length} drawing{drawings.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearDrawings}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    border: '1px solid #ef4444',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: 'transparent',
                    color: '#ef4444',
                  }}
                >
                  Clear All
                </button>
              </>
            )}
          </div>
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