'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseUnits, formatUnits, quoteSwap } = require('../../src/swap/money.js');

function provider(overrides = {}) {
  return {
    feeBps: 25,
    feeFlatToNexus: '0.000001',
    feeFlatToSolana: '0.00000001',
    minToNexus: '0.00000100',
    minToSolana: '0.000001',
    nexusDecimals: 6,
    solanaDecimals: 8,
    ...overrides,
  };
}

test('parseUnits and formatUnits preserve exact plain decimal amounts', () => {
  assert.equal(parseUnits('123.450006', 6), 123450006n);
  assert.equal(parseUnits('7', 0), 7n);
  assert.equal(formatUnits(123450006n, 6), '123.450006');
  assert.equal(formatUnits(100000000n, 8), '1');
  assert.equal(formatUnits(-1200n, 3), '-1.2');
});

test('parseUnits rejects ambiguous, rounded, exponent, signed, and unsafe inputs', () => {
  for (const value of ['', ' 1', '1 ', '.1', '1.', '01', '+1', '-1', '1e3', 'NaN', '0.0000001']) {
    assert.throws(() => parseUnits(value, 6), /amount/i, value);
  }
  assert.throws(() => parseUnits(1, 6), /string/i);
  assert.throws(() => parseUnits('1', -1), /decimals/i);
  assert.throws(() => formatUnits(1, 6), /bigint/i);
});

test('quoteSwap converts 8 to 6 decimals before output-domain fees', () => {
  const quote = quoteSwap(provider(), 'solana-to-nexus', '1.23456789');
  assert.deepEqual(quote, {
    direction: 'solana-to-nexus',
    inputUnits: '123456789',
    grossOutputUnits: '1234567',
    flatFeeUnits: '1',
    bpsFeeUnits: '3086',
    feeUnits: '3087',
    outputUnits: '1231480',
    inputAmount: '1.23456789',
    outputAmount: '1.23148',
    feeAmount: '0.003087',
  });
});

test('quoteSwap converts 6 to 8 decimals before output-domain fees', () => {
  const quote = quoteSwap(provider(), 'nexus-to-solana', '1.234567');
  assert.deepEqual(quote, {
    direction: 'nexus-to-solana',
    inputUnits: '1234567',
    grossOutputUnits: '123456700',
    flatFeeUnits: '1',
    bpsFeeUnits: '308641',
    feeUnits: '308642',
    outputUnits: '123148058',
    inputAmount: '1.234567',
    outputAmount: '1.23148058',
    feeAmount: '0.00308642',
  });
});

test('quoteSwap enforces the directional input minimum exactly', () => {
  const minimumProvider = provider({ feeFlatToNexus: '0' });
  assert.doesNotThrow(() => quoteSwap(minimumProvider, 'solana-to-nexus', '0.00000100'));
  assert.throws(
    () => quoteSwap(minimumProvider, 'solana-to-nexus', '0.00000099'),
    (error) => error.code === 'BELOW_MINIMUM'
  );
});

test('quoteSwap blocks zero, conversion dust, and fee-only outputs', () => {
  assert.throws(() => quoteSwap(provider(), 'solana-to-nexus', '0'), (e) => e.code === 'NONPOSITIVE_INPUT');
  assert.throws(
    () => quoteSwap(provider({ minToNexus: '0' }), 'solana-to-nexus', '0.00000001'),
    (e) => e.code === 'DUST_OUTPUT'
  );
  assert.throws(
    () => quoteSwap(provider({ minToNexus: '0', feeFlatToNexus: '1' }), 'solana-to-nexus', '0.5'),
    (e) => e.code === 'FEE_ONLY'
  );
});

test('quoteSwap fails closed on unknown policy, decimals, or direction', () => {
  for (const patch of [
    { feeBps: undefined },
    { feeFlatToNexus: undefined },
    { minToNexus: undefined },
    { nexusDecimals: undefined },
    { feeBps: 10001 },
  ]) {
    assert.throws(() => quoteSwap(provider(patch), 'solana-to-nexus', '1'));
  }
  assert.throws(() => quoteSwap(provider(), 'sideways', '1'), /direction/i);
});
