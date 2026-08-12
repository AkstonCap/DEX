/**
 * The two core conventions every market figure depends on: NXS arrives in
 * divisible units (amount * 1e6), and the core's `price` field is unreliable
 * and must be recomputed from the amounts.
 */

import {
  normalizeMarketEntry,
  normalizeMarketEntries,
  normalizeMarketSides,
} from '../src/utils/marketData';

// 100 NXS paid for 4 DIST -> 25 NXS per DIST
const rawBid = {
  txid: 'bid-1',
  type: 'bid',
  price: 999999, // the core's unreliable value
  contract: { amount: 100 * 1e6, ticker: 'NXS' },
  order: { amount: 4, ticker: 'DIST' },
};

// 4 DIST sold for 100 NXS -> 25 NXS per DIST
const rawAsk = {
  txid: 'ask-1',
  type: 'ask',
  price: 999999,
  contract: { amount: 4, ticker: 'DIST' },
  order: { amount: 100 * 1e6, ticker: 'NXS' },
};

describe('normalizeMarketEntry', () => {
  test('converts NXS out of divisible units and leaves other tokens alone', () => {
    const bid = normalizeMarketEntry(rawBid);
    expect(bid.contract.amount).toBe(100);
    expect(bid.order.amount).toBe(4);
  });

  test('recomputes bid price as quote per base, ignoring the core price field', () => {
    expect(normalizeMarketEntry(rawBid).price).toBe(25);
  });

  test('recomputes ask price as quote per base, ignoring the core price field', () => {
    expect(normalizeMarketEntry(rawAsk).price).toBe(25);
  });

  test('a bid and an ask at the same real price normalize to the same price', () => {
    expect(normalizeMarketEntry(rawBid).price).toBe(normalizeMarketEntry(rawAsk).price);
  });

  test('does not mutate the input', () => {
    const input = JSON.parse(JSON.stringify(rawBid));
    normalizeMarketEntry(input);
    expect(input.contract.amount).toBe(100 * 1e6);
    expect(input.price).toBe(999999);
  });

  test('normalizing twice would halve NXS again - callers must not double-apply', () => {
    const once = normalizeMarketEntry(rawBid);
    const twice = normalizeMarketEntry(once);
    expect(twice.contract.amount).toBe(100 / 1e6);
  });

  test('prices a token/token pair without touching either amount', () => {
    const entry = normalizeMarketEntry({
      type: 'bid',
      contract: { amount: 50, ticker: 'USDD' },
      order: { amount: 2, ticker: 'DIST' },
    });
    expect(entry.contract.amount).toBe(50);
    expect(entry.price).toBe(25);
  });

  test('reports 0 rather than Infinity when an amount is zero', () => {
    const entry = normalizeMarketEntry({
      type: 'bid',
      contract: { amount: 100, ticker: 'NXS' },
      order: { amount: 0, ticker: 'DIST' },
    });
    expect(entry.price).toBe(0);
  });
});

describe('normalizeMarketEntries / normalizeMarketSides', () => {
  test('a missing side yields an empty array, not a crash', () => {
    expect(normalizeMarketEntries(undefined)).toEqual([]);
    expect(normalizeMarketSides(undefined)).toEqual({ bids: [], asks: [] });
    expect(normalizeMarketSides({ bids: [rawBid] }).asks).toEqual([]);
  });

  test('normalizes every entry in both sides', () => {
    const { bids, asks } = normalizeMarketSides({ bids: [rawBid], asks: [rawAsk] });
    expect(bids[0].price).toBe(25);
    expect(asks[0].price).toBe(25);
    expect(bids[0].contract.amount).toBe(100);
    expect(asks[0].order.amount).toBe(100);
  });
});
