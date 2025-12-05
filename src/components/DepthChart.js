import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { FieldSet, Button } from 'nexus-module';
import styled from '@emotion/styled';
import {
  VictoryChart,
  VictoryArea,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from 'victory';
import { formatNumberWithLeadingZeros } from '../actions/formatNumber';
import { formatTokenName } from './styles';

const ChartControls = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 10px;
`;

export default function DepthChart() {
  const [isLogarithmic, setIsLogarithmic] = useState(true);
  const orderBook = useSelector((state) => state.ui.market.orderBook);
  const quoteToken = useSelector((state) => state.ui.market.marketPairs.quoteToken);
  const baseToken = useSelector((state) => state.ui.market.marketPairs.baseToken);
  const baseTokenDecimals = useSelector((state) => state.ui.market.marketPairs.baseTokenDecimals);
  const quoteTokenDecimals = useSelector((state) => state.ui.market.marketPairs.quoteTokenDecimals);

  const depthData = useMemo(() => {
    const bids = Array.isArray(orderBook?.bids) ? orderBook.bids : [];
    const asks = Array.isArray(orderBook?.asks) ? orderBook.asks : [];

    // Process bids (buy orders) - sorted descending by price
    const bidPrices = new Map();
    bids.forEach(order => {
      const price = parseFloat(order.price);
      const baseAmount = parseFloat(order.order?.amount || 0);
      if (!bidPrices.has(price)) {
        bidPrices.set(price, 0);
      }
      bidPrices.set(price, bidPrices.get(price) + baseAmount);
    });

    // Process asks (sell orders) - sorted ascending by price
    const askPrices = new Map();
    asks.forEach(order => {
      const price = parseFloat(order.price);
      const baseAmount = parseFloat(order.order?.amount || 0);
      if (!askPrices.has(price)) {
        askPrices.set(price, 0);
      }
      askPrices.set(price, askPrices.get(price) + baseAmount);
    });

    // Sort and accumulate bids (descending price, accumulate from highest to lowest)
    const sortedBids = Array.from(bidPrices.entries())
      .sort((a, b) => b[0] - a[0]); // Sort descending
    
    let bidCumulative = 0;
    const bidDepth = sortedBids.map(([price, amount]) => {
      bidCumulative += amount;
      return { price, depth: bidCumulative, type: 'bid' };
    }).reverse(); // Reverse to have ascending prices for chart

    // Sort and accumulate asks (ascending price, accumulate from lowest to highest)
    const sortedAsks = Array.from(askPrices.entries())
      .sort((a, b) => a[0] - b[0]); // Sort ascending
    
    let askCumulative = 0;
    const askDepth = sortedAsks.map(([price, amount]) => {
      askCumulative += amount;
      return { price, depth: askCumulative, type: 'ask' };
    });

    return { bidDepth, askDepth };
  }, [orderBook]);

  const { bidDepth, askDepth } = depthData;

  // Find the midpoint price for vertical line
  const midPrice = useMemo(() => {
    if (bidDepth.length > 0 && askDepth.length > 0) {
      const highestBid = bidDepth[bidDepth.length - 1]?.price || 0;
      const lowestAsk = askDepth[0]?.price || 0;
      return (highestBid + lowestAsk) / 2;
    }
    return null;
  }, [bidDepth, askDepth]);

  // Calculate domain with midPrice centered
  const allPrices = [...bidDepth.map(d => d.price), ...askDepth.map(d => d.price)];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const maxDepth = Math.max(
    bidDepth.length > 0 ? bidDepth[bidDepth.length - 1].depth : 0,
    askDepth.length > 0 ? askDepth[askDepth.length - 1].depth : 0
  );

  // Calculate centered domain around midPrice
  const xDomain = useMemo(() => {
    if (isLogarithmic) {
      if (!midPrice) return [minPrice * 0.95, maxPrice * 1.05];
      
      // For log scale, center around midPrice using ratios
      const ratioToMin = midPrice / minPrice;
      const ratioToMax = maxPrice / midPrice;
      const maxRatio = Math.max(ratioToMin, ratioToMax);
      
      return [midPrice / (maxRatio * 1.1), midPrice * (maxRatio * 1.1)];
    } else {
      // For linear scale, start from 0 and extend to max price
      return [0, maxPrice * 1.05];
    }
  }, [midPrice, minPrice, maxPrice, isLogarithmic]);

  if (bidDepth.length === 0 && askDepth.length === 0) {
    return (
      <FieldSet legend={`Market Depth - ${formatTokenName(baseToken)}/${formatTokenName(quoteToken)}`}>
        <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
          No order book data available
        </div>
      </FieldSet>
    );
  }

  return (
    <FieldSet legend={`Market Depth - ${formatTokenName(baseToken)}/${formatTokenName(quoteToken)}`}>
      <ChartControls>
        <Button
          skin={isLogarithmic ? 'primary' : 'default'}
          onClick={() => setIsLogarithmic(true)}
        >
          Logarithmic
        </Button>
        <Button
          skin={!isLogarithmic ? 'primary' : 'default'}
          onClick={() => setIsLogarithmic(false)}
        >
          Linear
        </Button>
      </ChartControls>
      <div style={{ width: '100%', height: '400px' }}>
        <VictoryChart
          theme={VictoryTheme.material}
          padding={{ top: 20, bottom: 50, left: 80, right: 50 }}
          width={800}
          height={400}
          scale={{ x: isLogarithmic ? 'log' : 'linear', y: 'linear' }}
          domain={{
            x: xDomain,
            y: [0, maxDepth * 1.1]
          }}
          containerComponent={
            <VictoryVoronoiContainer
              labels={({ datum }) => 
                `Price: ${formatNumberWithLeadingZeros(datum.price, 3, quoteTokenDecimals)} ${formatTokenName(quoteToken)}\nDepth: ${formatNumberWithLeadingZeros(datum.depth, 3, baseTokenDecimals)} ${formatTokenName(baseToken)}`
              }
              labelComponent={
                <VictoryTooltip
                  cornerRadius={3}
                  flyoutStyle={{
                    stroke: 'rgba(255, 255, 255, 0.3)',
                    fill: 'rgba(0, 0, 0, 0.9)'
                  }}
                  style={{
                    fill: 'white',
                    fontSize: 12
                  }}
                />
              }
            />
          }
        >
          <VictoryAxis
            label={`Price (${formatTokenName(quoteToken)})`}
            style={{
              axisLabel: { padding: 35, fill: '#888', fontSize: 12 },
              tickLabels: { fill: '#888', fontSize: 10 },
              grid: { stroke: 'rgba(255, 255, 255, 0.1)' }
            }}
            tickFormat={(t) => formatNumberWithLeadingZeros(t, 2, quoteTokenDecimals)}
          />
          <VictoryAxis
            dependentAxis
            label={`Cumulative Depth (${formatTokenName(baseToken)})`}
            style={{
              axisLabel: { padding: 60, fill: '#888', fontSize: 12 },
              tickLabels: { fill: '#888', fontSize: 10 },
              grid: { stroke: 'rgba(255, 255, 255, 0.1)' }
            }}
            tickFormat={(t) => formatNumberWithLeadingZeros(t, 2, baseTokenDecimals)}
          />

          {/* Bids (buy orders) - green */}
          {bidDepth.length > 0 && (
            <VictoryArea
              data={bidDepth}
              x="price"
              y="depth"
              interpolation="stepAfter"
              style={{
                data: {
                  fill: 'rgba(34, 197, 94, 0.3)',
                  stroke: 'rgb(34, 197, 94)',
                  strokeWidth: 2
                }
              }}
            />
          )}

          {/* Asks (sell orders) - red */}
          {askDepth.length > 0 && (
            <VictoryArea
              data={askDepth}
              x="price"
              y="depth"
              interpolation="stepBefore"
              style={{
                data: {
                  fill: 'rgba(239, 68, 68, 0.3)',
                  stroke: 'rgb(239, 68, 68)',
                  strokeWidth: 2
                }
              }}
            />
          )}
        </VictoryChart>
      </div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '20px', 
        marginTop: '10px',
        fontSize: '12px',
        color: '#888'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '3px', background: 'rgb(34, 197, 94)' }}></div>
          <span>Bids (Buy Orders)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '20px', height: '3px', background: 'rgb(239, 68, 68)' }}></div>
          <span>Asks (Sell Orders)</span>
        </div>
        {midPrice && (
          <div style={{ marginLeft: '20px' }}>
            Spread: {formatNumberWithLeadingZeros(midPrice, 3, quoteTokenDecimals)} {formatTokenName(quoteToken)}
          </div>
        )}
      </div>
    </FieldSet>
  );
}
