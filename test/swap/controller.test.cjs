'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {createJobStore} = require('../../src/swap/jobs.js');
const {createSwapController} = require('../../src/swap/controller.js');

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
  return {request(name, options, callback) {
    if (typeof options === 'function') callback = options;
    const result = queue.then(() => callback());
    queue = result.catch(() => {});
    return result;
  }};
}
const scope = {genesis: 'nexus-genesis', nexusNetwork: 'testnet', solanaGenesis: 'sol-genesis'};
function intent(direction = 'solana-to-nexus', overrides = {}) {
  return {
    scope,
    direction,
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
    ...overrides,
  };
}
function harness(overrides = {}) {
  const disk = overrides.persistence || persistence();
  const store = createJobStore({persistence: disk, locks: overrides.locks || serialLocks()});
  const calls = {funding: 0, debit: 0, verifyDebit: 0, mapping: 0, deposit: 0, nexusOutput: 0, solanaOutput: 0, inspect: 0};
  let currentScope = clone(scope);
  const nexus = {
    submitDebit: async () => { calls.debit += 1; return {txid: 'debit-tx'}; },
    verifyDebit: async txid => { calls.verifyDebit += 1; return {verified: true, txid, finalized: true}; },
    publishMapping: async () => { calls.mapping += 1; return {address: 'mapping-address', txid: 'mapping-tx'}; },
    inspectSource: async (job, candidate) => { calls.inspect += 1; return {resolved: true, sourceTxid: candidate?.txid || 'credit-tx', debitTxid: job.debitTxid, contractId: candidate?.sourceContract || '9', evidence: {finalized: true}}; },
    verifyOutput: async txid => { calls.nexusOutput += 1; return {verified: true, txid, exact: true}; },
    ...overrides.nexus,
  };
  const solana = {
    verifyDeposit: async txid => { calls.deposit += 1; return {signature: txid, sourceContract: 'source-token', units: '1000000'}; },
    verifyPayout: async txid => { calls.solanaOutput += 1; return {signature: txid, exact: true}; },
    ...overrides.solana,
  };
  const controller = createSwapController({
    store,
    nexus,
    solana,
    validateFunding: async () => { calls.funding += 1; },
    loadScope: async () => clone(currentScope),
  });
  return {disk, store, calls, controller, setScope: value => { currentScope = clone(value); }};
}

test('actual controller completes Solana-to-Nexus from durable handoff and exact proofs', async () => {
  const h = harness();
  const created = await h.controller.createJob(intent());
  assert.equal(created.state, 'draft');
  assert.match(created.id, /^[0-9a-f-]{36}$/i);
  assert.match(created.reference, /^[1-9][0-9]*$/);
  assert.ok(BigInt(created.reference) <= 18446744073709551615n);
  assert.equal(created.nexusMinConfirmations, 6);

  const handoff = await h.controller.prepareSolana(created.id);
  assert.equal(handoff.state, 'awaiting_signature');
  assert.equal(h.store.get(created.id).state, 'awaiting_signature');

  const sourced = await h.controller.attachSource(created.id, 'sol-signature');
  assert.equal(sourced.state, 'awaiting_payout');
  assert.equal(sourced.sourceTxid, 'sol-signature');
  assert.equal(sourced.sourceContract, 'source-token');

  const complete = await h.controller.complete(created.id, 'nexus-payout');
  assert.equal(complete.state, 'completed');
  assert.equal(complete.payoutTxid, 'nexus-payout');
  assert.equal(h.calls.deposit, 1);
  assert.equal(h.calls.nexusOutput, 1);
  assert.equal(h.calls.funding, 1);
});

test('job deduplication never substitutes a lower Nexus confirmation policy', async () => {
  const h = harness();
  const defaultJob = await h.controller.createJob(intent());
  const strongerJob = await h.controller.createJob(intent('solana-to-nexus', {nexusMinConfirmations: 7}));
  assert.notEqual(strongerJob.id, defaultJob.id);
  assert.equal(strongerJob.nexusMinConfirmations, 7);
  await assert.rejects(
    h.controller.createJob(intent('solana-to-nexus', {nexusMinConfirmations: 5})),
    /nexusMinConfirmations/,
  );
});

test('read-only Nexus receipt observation completes only with its returned exact payout identity', async () => {
  let requested = 'not-called';
  const proof = {verified: true, txid: 'observed-nexus-payout', contractId: 4, claimEvidence: {txid: 'credit-tx'}};
  const h = harness({nexus: {verifyOutput: async txid => { requested = txid; return proof; }}});
  const created = await h.controller.createJob(intent());
  await h.controller.prepareSolana(created.id);
  await h.controller.attachSource(created.id, 'solana-source');

  const completed = await h.controller.complete(created.id, null);
  assert.equal(requested, null);
  assert.equal(completed.state, 'completed');
  assert.equal(completed.payoutTxid, 'observed-nexus-payout');
  assert.deepEqual(completed.payoutEvidence, proof);
});

test('receipt observation rechecks wallet and network scope before persisting proof', async () => {
  let h;
  h = harness({nexus: {verifyOutput: async () => {
    h.setScope({...scope, genesis: 'switched-wallet'});
    return {verified: true, txid: 'observed-nexus-payout'};
  }}});
  const created = await h.controller.createJob(intent());
  await h.controller.prepareSolana(created.id);
  await h.controller.attachSource(created.id, 'solana-source');

  await assert.rejects(h.controller.complete(created.id, null), /scope changed/i);
  assert.equal(h.controller.get(created.id).state, 'awaiting_payout');
  assert.equal(h.controller.get(created.id).payoutTxid, undefined);
});

test('pending Nexus claim persists receipt proof without terminalizing the job', async () => {
  const proof = {
    verified: false, pendingClaim: true, reason: 'nexus_output_pending_claim',
    txid: 'observed-nexus-payout', contractId: 4, receipt: {address: 'receipt'},
  };
  const h = harness({nexus: {verifyOutput: async () => proof}});
  const created = await h.controller.createJob(intent());
  await h.controller.prepareSolana(created.id);
  await h.controller.attachSource(created.id, 'solana-source');

  const pending = await h.controller.complete(created.id, null);
  assert.equal(pending.state, 'awaiting_payout');
  assert.equal(pending.payoutTxid, 'observed-nexus-payout');
  assert.equal(pending.reason, 'nexus_output_pending_claim');
  assert.deepEqual(pending.payoutEvidence, proof);
});

test('actual controller completes Nexus-to-Solana without confusing debit and CREDIT identities', async () => {
  const h = harness();
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  const submitted = await h.controller.submitNexus(created.id);
  assert.equal(submitted.state, 'awaiting_service_credit');
  assert.equal(submitted.debitTxid, 'debit-tx');
  assert.equal(submitted.mappingAddress, undefined);
  assert.equal(submitted.sourceTxid, undefined);
  assert.equal(h.calls.mapping, 0);

  const observed = await h.controller.inspect(created.id);
  assert.equal(observed.state, 'mapping_unknown');
  assert.equal(observed.sourceTxid, 'credit-tx');
  assert.equal(observed.sourceContract, '9');
  assert.notEqual(observed.sourceTxid, observed.debitTxid);

  const mapped = await h.controller.repairMapping(created.id);
  assert.equal(mapped.state, 'awaiting_payout');
  assert.equal(mapped.mappingAddress, 'mapping-address');

  const completed = await h.controller.complete(created.id, 'solana-payout');
  assert.equal(completed.state, 'completed');
  assert.equal(h.calls.debit, 1);
  assert.equal(h.calls.mapping, 1);
  assert.equal(h.calls.solanaOutput, 1);
  assert.equal(h.calls.funding, 1);
});

test('lost Nexus response persists unknown and duplicate invocation never resubmits', async () => {
  let debits = 0;
  const h = harness({nexus: {submitDebit: async () => { debits += 1; throw new Error('timeout after accept'); }}});
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  await assert.rejects(h.controller.submitNexus(created.id), /timeout/);
  assert.equal(h.store.get(created.id).state, 'submission_unknown');
  await assert.rejects(h.controller.submitNexus(created.id), /never retried|cannot be submitted/i);
  assert.equal(debits, 1);

  const restored = harness({persistence: h.disk, nexus: {submitDebit: async () => { debits += 1; return {txid: 'duplicate'}; }}});
  assert.equal(restored.controller.get(created.id).state, 'submission_unknown');
  await assert.rejects(restored.controller.submitNexus(created.id), /never retried|cannot be submitted/i);
  assert.equal(debits, 1);
});

test('storage failure before wallet mutation blocks the debit', async () => {
  let journal = {version: 1, jobs: []};
  let debits = 0;
  const disk = {
    readJournal: () => clone(journal),
    writeJournal: async next => {
      if (next.jobs[0]?.state === 'submission_unknown') throw new Error('disk full');
      journal = clone(next);
    },
  };
  const h = harness({persistence: disk, nexus: {submitDebit: async () => { debits += 1; return {txid: 'must-not-run'}; }}});
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  await assert.rejects(h.controller.submitNexus(created.id), /disk full/);
  assert.equal(debits, 0);
  assert.equal(h.store.get(created.id).state, 'draft');
});

test('storage failure after remote acceptance retains prior unknown and blocks repeat', async () => {
  let journal = {version: 1, jobs: []};
  let debits = 0;
  const disk = {
    readJournal: () => clone(journal),
    writeJournal: async next => {
      if (next.jobs[0]?.debitTxid) throw new Error('post-remote disk failure');
      journal = clone(next);
    },
  };
  const h = harness({persistence: disk, nexus: {submitDebit: async () => { debits += 1; return {txid: 'accepted-remotely'}; }}});
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  await assert.rejects(h.controller.submitNexus(created.id), /post-remote disk failure/);
  assert.equal(h.store.get(created.id).state, 'submission_unknown');
  await assert.rejects(h.controller.submitNexus(created.id), /never retried|cannot be submitted/i);
  assert.equal(debits, 1);
});

test('missing debit id remains submission_unknown and is never resubmitted', async () => {
  let debits = 0;
  const h = harness({nexus: {submitDebit: async () => { debits += 1; return {}; }}});
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  await assert.rejects(h.controller.submitNexus(created.id), /unknown|transaction id/i);
  assert.equal(h.store.get(created.id).state, 'submission_unknown');
  await assert.rejects(h.controller.submitNexus(created.id), /never retried|cannot be submitted/i);
  assert.equal(debits, 1);
});

test('explicit manual debit-id import recovers unknown submission using exact proof without resubmitting', async () => {
  let debits = 0;
  const h = harness({nexus: {submitDebit: async () => { debits += 1; throw new Error('lost response'); }}});
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  await assert.rejects(h.controller.submitNexus(created.id), /lost response/);

  const recovered = await h.controller.importNexusDebit(created.id, 'manual-debit-id');
  assert.equal(recovered.state, 'awaiting_service_credit');
  assert.equal(recovered.debitTxid, 'manual-debit-id');
  assert.equal(h.calls.verifyDebit, 1);
  assert.equal(debits, 1);
});

test('mapping failure never repeats debit or an uncertain mapping create', async () => {
  let mappings = 0;
  let debits = 0;
  const h = harness({nexus: {
    submitDebit: async () => { debits += 1; return {txid: 'debit-once'}; },
    publishMapping: async () => {
      mappings += 1;
      throw new Error('mapping unavailable');
    },
  }});
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  await h.controller.submitNexus(created.id);
  await h.controller.inspect(created.id);
  await assert.rejects(h.controller.repairMapping(created.id), /mapping unavailable/);
  assert.equal(h.store.get(created.id).state, 'mapping_unknown');
  await assert.rejects(h.controller.repairMapping(created.id), /manual/i);
  assert.equal(debits, 1);
  assert.equal(mappings, 1);
});

test('scope is revalidated before funding, source observation, and completion', async () => {
  let inspections = 0;
  const h = harness({nexus: {inspectSource: async () => { inspections += 1; return {status: 'pending'}; }}});
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  h.setScope({...scope, genesis: 'other-wallet'});
  await assert.rejects(h.controller.submitNexus(created.id), /scope changed/i);
  assert.equal(h.calls.debit, 0);

  h.setScope(scope);
  await h.controller.submitNexus(created.id);
  h.setScope({...scope, solanaGenesis: 'other-cluster'});
  await assert.rejects(h.controller.inspect(created.id), /scope changed/i);
  assert.equal(inspections, 0);
});

test('false source and output evidence are rejected without terminalizing', async () => {
  const h = harness({
    solana: {verifyDeposit: async () => ({signature: 'different-signature', sourceContract: 'source-token'})},
    nexus: {verifyOutput: async () => ({verified: true, txid: 'different-payout'})},
  });
  const created = await h.controller.createJob(intent());
  await h.controller.prepareSolana(created.id);
  await assert.rejects(h.controller.attachSource(created.id, 'claimed-source'), /does not match/i);
  assert.equal(h.store.get(created.id).state, 'awaiting_signature');

  const invalidOutput = harness({nexus: {verifyOutput: async () => ({verified: true, txid: 'different-payout'})}});
  const next = await invalidOutput.controller.createJob(intent());
  await invalidOutput.controller.prepareSolana(next.id);
  await invalidOutput.controller.attachSource(next.id, 'valid-source');
  await assert.rejects(invalidOutput.controller.complete(next.id, 'claimed-payout'), /does not match/i);
  assert.equal(invalidOutput.store.get(next.id).state, 'awaiting_payout');
});

test('source evidence cannot be reused across controller jobs', async () => {
  const h = harness();
  const first = await h.controller.createJob(intent());
  await h.controller.prepareSolana(first.id);
  await h.controller.attachSource(first.id, 'reused-signature');

  const second = await h.controller.createJob(intent('solana-to-nexus', {nexusAccount: 'other-nexus-account'}));
  await h.controller.prepareSolana(second.id);
  await assert.rejects(h.controller.attachSource(second.id, 'reused-signature'), /source evidence/i);
  assert.equal(h.store.get(second.id).state, 'awaiting_signature');
});

test('cancellation is durable only while draft and create double-click deduplicates active intent', async () => {
  const h = harness();
  const [first, second] = await Promise.all([
    h.controller.createJob(intent()),
    h.controller.createJob(intent()),
  ]);
  assert.equal(first.id, second.id);
  assert.equal(h.store.list(scope).length, 1);
  const cancelled = await h.controller.cancel(first.id);
  assert.equal(cancelled.state, 'cancelled');
  await assert.rejects(h.controller.prepareSolana(first.id), /cancelled|not allowed/i);

  const replacement = await h.controller.createJob(intent());
  await h.controller.prepareSolana(replacement.id);
  await assert.rejects(h.controller.cancel(replacement.id), /before handoff|awaiting_signature/i);
});


test('unverified mapping readback retains remote identity but does not advance to payout', async () => {
  const h=harness({nexus:{publishMapping:async()=>({resolved:false,reason:'readback unavailable',address:'accepted-address',txid:'accepted-mapping-tx'})}});
  const job=await h.controller.createJob(intent('nexus-to-solana'));
  await h.controller.submitNexus(job.id); await h.controller.inspect(job.id);
  await h.controller.repairMapping(job.id);
  assert.equal(h.controller.get(job.id).state,'mapping_unknown');
  assert.equal(h.controller.get(job.id).mappingAddress,'accepted-address');
});

test('false verification with a matching output id cannot complete a job', async () => {
  const h=harness({nexus:{verifyOutput:async txid=>({verified:false,txid,reason:'pending claim'})}});
  const job=await h.controller.createJob(intent());
  await h.controller.prepareSolana(job.id); await h.controller.attachSource(job.id,'deposit');
  await assert.rejects(()=>h.controller.complete(job.id,'output'),/proof|verif/i);
  assert.equal(h.controller.get(job.id).state,'awaiting_payout');
});

test('numeric Nexus CREDIT id is normalized for the actual Solana memo codec', async () => {
  const h=harness({nexus:{inspectSource:async job=>({resolved:true,sourceTxid:'credit-tx',debitTxid:job.debitTxid,contractId:0,evidence:{finalized:true}})}});
  const job=await h.controller.createJob(intent('nexus-to-solana'));
  await h.controller.submitNexus(job.id); await h.controller.inspect(job.id);
  assert.equal(h.controller.get(job.id).sourceContract,'0');
});

test('generated reference survives the Nexus JSON-number wire boundary exactly', async t => {
  t.mock.method(globalThis.crypto,'getRandomValues',values=>{values.fill(0xffffffff);return values;});
  const h=harness(); const job=await h.controller.createJob(intent());
  assert.equal(Number.isSafeInteger(Number(job.reference)),true);
  assert.equal(BigInt(Number(job.reference)).toString(),job.reference);
});

test('manual debit import rejects matching identity unless Nexus explicitly verifies it', async () => {
  const h = harness({nexus: {submitDebit: async () => { throw new Error('lost'); }, verifyDebit: async txid => ({verified:false, txid})}});
  const created = await h.controller.createJob(intent('nexus-to-solana'));
  await assert.rejects(h.controller.submitNexus(created.id), /lost/);
  await assert.rejects(h.controller.importNexusDebit(created.id, 'manual-debit-id'), /verified/i);
  assert.equal(h.controller.get(created.id).state, 'submission_unknown');
});

test('unknown mapping without returned identity cannot create twice and exact manual identity can recover', async () => {
  let creates = 0;
  const h = harness({nexus:{
    publishMapping:async()=>{ creates += 1; return {resolved:false,reason:'mapping_create_outcome_unknown'}; },
    verifyMapping:async(address,txid)=>({verified:true,address,txid,evidence:{operation:'CREATE'}}),
  }});
  const job=await h.controller.createJob(intent('nexus-to-solana'));
  await h.controller.submitNexus(job.id); await h.controller.inspect(job.id);
  await assert.rejects(h.controller.repairMapping(job.id), /unknown/i);
  await assert.rejects(h.controller.repairMapping(job.id), /manual/i);
  assert.equal(creates,1);
  const recovered=await h.controller.recoverMapping(job.id,'manual-address','manual-create-tx');
  assert.equal(recovered.state,'awaiting_payout');
  assert.equal(recovered.mappingAddress,'manual-address');
  assert.equal(recovered.mappingTxid,'manual-create-tx');
});
