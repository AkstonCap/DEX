'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  ProviderError,
  normalizeProvider,
  enrichProvider,
  assertProviderReady,
  sameProviderTerms,
  discoverProviders,
  rereadProvider,
} = require('../../src/swap/providers.js');

const NOW = 2_000_000_000_000;

function rawProvider(address = 'asset-A', overrides = {}) {
  return {
    address,
    owner: 'owner-A',
    name: `asset-name-${address}`,
    distordiaType: 'nexusBridgeHeartbeat',
    provider: `Operator ${address}`,
    memo_prefix: 'nexus:',
    nexus_token: 'USDD',
    nexus_treasury_address: `treasury-${address}`,
    nexus_token_register_address: `token-${address}`,
    solana_token: 'USDC',
    solana_vault_address: `vault-${address}`,
    solana_vault_mint: `mint-${address}`,
    last_poll_timestamp: String(Math.floor(NOW / 1000) - 30),
    status: 'online',
    fee_flat_to_nexus: '0.1',
    fee_flat_to_solana: '0.2',
    fee_bps: '25',
    min_to_nexus: '1',
    min_to_solana: '2',
    ...overrides,
  };
}

function readyProvider(raw = rawProvider(), enrichment = {}) {
  return enrichProvider(normalizeProvider(raw, NOW), {
    nexusDecimals: 6,
    solanaDecimals: 8,
    solanaVaultOwner: 'vault-authority',
    solanaGenesis: 'genesis-hash',
    nexusNetwork: 'nexus-network-id',
    ...enrichment,
  });
}

test('a future explicit schema must not be downgraded into the unversioned v1 adapter', () => {
  assert.throws(() => normalizeProvider(rawProvider('future', {schema:'future-v2'}), NOW), /schema/i);
});

test('receipt capability is preserved and participates in frozen provider terms', () => {
  const legacy = normalizeProvider(rawProvider(), NOW);
  const upgraded = normalizeProvider(rawProvider('asset-A', {receipt_schema:'nexus-swap-receipt-v1'}), NOW);
  assert.equal(upgraded.receiptSchema, 'nexus-swap-receipt-v1');
  assert.equal(sameProviderTerms(legacy, upgraded), false);
});

test('normalizeProvider maps only the complete recommended v1 record', () => {
  assert.deepEqual(normalizeProvider(rawProvider(), NOW), {
    schema: 'recommended-v1',
    address: 'asset-A',
    owner: 'owner-A',
    name: 'Operator asset-A',
    nexusToken: 'token-asset-A',
    nexusTreasury: 'treasury-asset-A',
    nexusSymbol: 'USDD',
    solanaMint: 'mint-asset-A',
    solanaVault: 'vault-asset-A',
    solanaSymbol: 'USDC',
    memoPrefix: 'nexus:',
    feeBps: 25,
    feeFlatToNexus: '0.1',
    feeFlatToSolana: '0.2',
    minToNexus: '1',
    minToSolana: '2',
    timestamp: NOW - 30000,
    status: 'online',
  });
});

test('normalizeProvider rejects unknown, planned-v2, legacy-incomplete, malformed, and future records clearly', () => {
  const cases = [
    [{ address: 'x', distordiaType: 'somethingElse' }, 'UNSUPPORTED_SCHEMA'],
    [{ address: 'x', 'distordia-type': 'swapService' }, 'UNSUPPORTED_SCHEMA'],
    [rawProvider('x', { nexus_token_register_address: undefined }), 'MISSING_FIELD'],
    [rawProvider('x', { fee_bps: '1.5' }), 'INVALID_FIELD'],
    [rawProvider('x', { fee_flat_to_nexus: '1e-3' }), 'INVALID_FIELD'],
    [rawProvider('x', { last_poll_timestamp: String(Math.floor((NOW + 300001) / 1000)) }), 'FUTURE_TIMESTAMP'],
  ];
  for (const [raw, code] of cases) {
    assert.throws(
      () => normalizeProvider(raw, NOW),
      (error) => error instanceof ProviderError && error.code === code,
      code
    );
  }
});

test('enrichment is explicit and readiness blocks incomplete, paused, stale, and future providers', () => {
  assert.throws(() => assertProviderReady(normalizeProvider(rawProvider(), NOW), NOW), (e) => e.code === 'MISSING_ENRICHMENT');
  assert.equal(assertProviderReady(readyProvider(), NOW), true);
  assert.throws(() => assertProviderReady(readyProvider(rawProvider('p', { status: 'paused' })), NOW), (e) => e.code === 'PROVIDER_NOT_ONLINE');
  assert.throws(
    () => assertProviderReady(readyProvider(rawProvider('s', { last_poll_timestamp: String(Math.floor(NOW / 1000) - 601) })), NOW),
    (e) => e.code === 'STALE_PROVIDER'
  );
  assert.throws(
    () => assertProviderReady(readyProvider(rawProvider('boundary', { last_poll_timestamp: String(Math.floor(NOW / 1000) - 600) })), NOW),
    (e) => e.code === 'STALE_PROVIDER'
  );
  const ready = readyProvider();
  assert.throws(() => assertProviderReady({ ...ready, timestamp: NOW + 300001 }, NOW), (e) => e.code === 'FUTURE_TIMESTAMP');
  assert.throws(() => enrichProvider(normalizeProvider(rawProvider(), NOW), { nexusDecimals: 1.5 }), /nexusDecimals/);
});

test('sameProviderTerms includes identities, policy, precision, and networks but ignores liveness', () => {
  const a = readyProvider();
  const normalized = normalizeProvider(rawProvider(), NOW);
  assert.equal(sameProviderTerms(normalized, { ...normalized }), true);
  assert.equal(sameProviderTerms(a, { ...a, timestamp: a.timestamp + 1000, status: 'paused' }), true);
  assert.equal(sameProviderTerms(a, { ...a, nexusToken: 'different' }), false);
  assert.equal(sameProviderTerms(a, { ...a, feeBps: 26 }), false);
  assert.equal(sameProviderTerms(a, { ...a, solanaDecimals: 6 }), false);
  assert.equal(sameProviderTerms(a, { ...a, nexusNetwork: 'other-network' }), false);
});

test('discoverProviders paginates without collapsing same-owner providers', async () => {
  const pages = [
    [rawProvider('one'), rawProvider('two', { owner: 'owner-A' })],
    [rawProvider('three')],
  ];
  const calls = [];
  const result = await discoverProviders(async (endpoint, params) => {
    calls.push([endpoint, params]);
    return pages.shift();
  }, { pageSize: 2, maxPages: 4, nowMs: NOW });

  assert.equal(result.complete, true);
  assert.equal(result.error, null);
  assert.deepEqual(result.providers.map((provider) => provider.address), ['one', 'two', 'three']);
  assert.deepEqual(calls, [
    ['register/list/assets:asset', { limit: 2, offset: 0 }],
    ['register/list/assets:asset', { limit: 2, offset: 2 }],
  ]);
});

test('discoverProviders retains inspect errors while proving the scan complete', async () => {
  const result = await discoverProviders(async () => [
    rawProvider('good'),
    { address: 'future-v2', 'distordia-type': 'swapService' },
    rawProvider('legacy', { fee_flat_to_nexus: undefined }),
    { address: 'ordinary-untyped-asset' },
  ], { pageSize: 10, nowMs: NOW });
  assert.equal(result.complete, true);
  assert.deepEqual(result.providers.map((p) => p.address), ['good']);
  assert.deepEqual(result.rejected.map((entry) => entry.error.code), ['UNSUPPORTED_SCHEMA', 'MISSING_FIELD']);
});

test('discoverProviders fails closed on transport, malformed pages, duplicate conflicts, and page cap', async () => {
  const transport = await discoverProviders(async (_endpoint, { offset }) => {
    if (offset) throw new Error('offline');
    return [rawProvider('a')];
  }, { pageSize: 1, maxPages: 3, nowMs: NOW });
  assert.equal(transport.complete, false);
  assert.equal(transport.error.code, 'DISCOVERY_FAILED');

  const malformed = await discoverProviders(async () => ({ results: [] }), { nowMs: NOW });
  assert.equal(malformed.complete, false);
  assert.equal(malformed.error.code, 'INVALID_DISCOVERY_PAGE');

  const conflictPages = [
    [rawProvider('dup')],
    [rawProvider('dup', { fee_bps: '99' })],
  ];
  const duplicate = await discoverProviders(async () => conflictPages.shift(), { pageSize: 1, maxPages: 3, nowMs: NOW });
  assert.equal(duplicate.complete, false);
  assert.equal(duplicate.error.code, 'DUPLICATE_PROVIDER_CONFLICT');
  assert.deepEqual(duplicate.providers, []);

  const capped = await discoverProviders(async () => [rawProvider(Math.random().toString())], { pageSize: 1, maxPages: 2, nowMs: NOW });
  assert.equal(capped.complete, false);
  assert.equal(capped.error.code, 'DISCOVERY_INCOMPLETE');
});

test('rereadProvider binds selection to the immutable asset address', async () => {
  const calls = [];
  const selected = await rereadProvider(async (endpoint, params) => {
    calls.push([endpoint, params]);
    return rawProvider('chosen');
  }, 'chosen', { nowMs: NOW });
  assert.equal(selected.address, 'chosen');
  assert.deepEqual(calls, [['register/get/assets:asset', { address: 'chosen' }]]);

  await assert.rejects(
    () => rereadProvider(async () => rawProvider('wrong'), 'chosen', { nowMs: NOW }),
    (error) => error.code === 'ADDRESS_MISMATCH'
  );
});
