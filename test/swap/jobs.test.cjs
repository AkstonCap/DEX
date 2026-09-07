'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createJobStore} = require('../../src/swap/jobs.js');

const clone = value => JSON.parse(JSON.stringify(value));

function persistence(initial = {version: 1, jobs: []}) {
  let journal = clone(initial);
  return {
    readJournal: () => clone(journal),
    writeJournal: async next => { journal = clone(next); },
    snapshot: () => clone(journal),
  };
}

function serialLocks() {
  let queue = Promise.resolve();
  return {
    request(name, options, callback) {
      if (typeof options === 'function') { callback = options; }
      const result = queue.then(() => callback());
      queue = result.catch(() => {});
      return result;
    },
  };
}

function job(overrides = {}) {
  return {
    id: 'job-1',
    reference: 'swap:job-1',
    nexusMinConfirmations: 6,
    scope: {genesis: 'nexus-genesis', nexusNetwork: 'testnet', solanaGenesis: 'sol-genesis'},
    direction: 'solana-to-nexus',
    provider: {
      address: 'provider', owner: 'owner', name: 'Bridge', nexusToken: 'token', nexusTreasury: 'treasury',
      nexusSymbol: 'NXS', solanaMint: 'mint', solanaVault: 'vault', solanaSymbol: 'SOLT', memoPrefix: 'nexus:',
      feeBps: 25, feeFlatToNexus: '0', feeFlatToSolana: '0', minToNexus: '1', minToSolana: '1',
      timestamp: '2026-09-07T00:00:00.000Z', status: 'active', nexusDecimals: 6, solanaDecimals: 6,
      solanaGenesis: 'sol-genesis', nexusNetwork: 'testnet',
    },
    quote: {inputUnits: '1000000', outputUnits: '997500', feeUnits: '2500', inputAmount: '1', outputAmount: '0.9975'},
    nexusAccount: 'nexus-account',
    solanaAccount: 'solana-token-account',
    state: 'draft',
    expiresAt: Date.now() + 15 * 60 * 1000,
    ...overrides,
  };
}

test('create is durably acknowledged and list is exact-scope isolated', async () => {
  const disk = persistence();
  const store = createJobStore({persistence: disk, locks: serialLocks()});
  await store.create(job());

  assert.equal(disk.snapshot().jobs.length, 1);
  assert.deepEqual(store.list(job().scope).map(item => item.id), ['job-1']);
  assert.deepEqual(store.list({...job().scope, solanaGenesis: 'other'}), []);
});

test('journal validation blocks unknown versions, malformed jobs, secrets and missing locks', async () => {
  assert.throws(() => createJobStore({persistence: persistence()}), /WebLock|lock/i);
  const unknown = createJobStore({persistence: persistence({version: 2, jobs: []}), locks: serialLocks()});
  assert.throws(() => unknown.list(job().scope), /unsupported|malformed/i);
  const malformed = createJobStore({persistence: persistence({version: 1, jobs: [{id: 'only-an-id'}]}), locks: serialLocks()});
  assert.throws(() => malformed.get('only-an-id'), /malformed|direction|state/i);
  const store = createJobStore({persistence: persistence(), locks: serialLocks()});
  await assert.rejects(store.create(job({walletPrivateKey: 'never-store-this'})), /secret/i);
  await assert.rejects(store.create(job({id: 'huge', reference: 'swap:huge', diagnostic: 'x'.repeat(70 * 1024)})), /storage limit/i);
});

test('immutable intent and globally unique composite source evidence are enforced atomically', async () => {
  const store = createJobStore({persistence: persistence(), locks: serialLocks()});
  await store.create(job());
  await assert.rejects(store.create(job({id: 'missing-finality', nexusMinConfirmations: undefined})), /nexusMinConfirmations/);
  await assert.rejects(store.create(job({id: 'low-finality', nexusMinConfirmations: 5})), /nexusMinConfirmations/);
  await assert.rejects(store.update('job-1', current => ({...current, nexusMinConfirmations: 7})), /immutable/i);
  await assert.rejects(store.update('job-1', current => ({...current, expiresAt: current.expiresAt + 1})), /immutable/i);
  await assert.rejects(store.create(job({id:'missing-expiry', expiresAt:undefined})), /expiresAt/);
  await assert.rejects(store.update('job-1', current => ({...current, quote: {...current.quote, outputUnits: '1'}})), /immutable/i);
  await store.update('job-1', current => ({...current, sourceTxid: 'source', sourceContract: '7'}));
  await store.create(job({id: 'job-2', reference: 'swap:job-2'}));
  await assert.rejects(
    store.update('job-2', current => ({...current, sourceTxid: 'source', sourceContract: 7})),
    /source evidence/i,
  );
  await store.update('job-2', current => ({...current, sourceTxid: 'source', sourceContract: '8'}));
  await assert.rejects(
    store.update('job-1', current => ({...current, sourceTxid: 'replacement-source'})),
    /source.*immutable|immutable.*source/i,
  );
});

test('exclusive holds one lock across async commits and prevents controller races', async () => {
  const store = createJobStore({persistence: persistence(), locks: serialLocks()});
  await store.create(job());
  let calls = 0;
  const operation = () => store.exclusive(job().scope, async tx => {
    const current = tx.get('job-1');
    if (current.state !== 'draft') return current;
    tx.update('job-1', value => ({...value, state: 'submission_unknown'}));
    await tx.commit();
    await new Promise(resolve => setTimeout(resolve, 5));
    calls += 1;
    return tx.update('job-1', value => ({...value, debitTxid: 'debit', state: 'debit_submitted'}));
  });
  await Promise.all([operation(), operation()]);
  assert.equal(calls, 1);
  assert.equal(store.get('job-1').debitTxid, 'debit');
});

test('a negative durable-write acknowledgement does not commit a job', async () => {
  const disk = {
    readJournal: () => ({version: 1, jobs: []}),
    writeJournal: async () => false,
  };
  const store = createJobStore({persistence: disk, locks: serialLocks()});
  await assert.rejects(store.create(job()), /acknowledge|rejected|durable/i);
});
