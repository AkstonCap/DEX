'use strict';

const {DEFAULT_NEXUS_MIN_CONFIRMATIONS} = require('./jobs.js');

function cryptography() {
  const value = globalThis.crypto;
  if (!value || typeof value.randomUUID !== 'function' || typeof value.getRandomValues !== 'function') {
    throw new Error('Secure browser cryptography is required to create swap identities.');
  }
  return value;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sameScope(expected, actual) {
  return Boolean(expected && actual
    && expected.genesis === actual.genesis
    && expected.nexusNetwork === actual.nexusNetwork
    && expected.solanaGenesis === actual.solanaGenesis);
}

function requireText(value, label) {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${label} is required.`);
  return value;
}

function randomReference() {
  const words = cryptography().getRandomValues(new Uint32Array(2));
  // The Nexus wallet bridge parses JSON numbers; keep references exactly representable.
  const value = ((BigInt(words[0]) << 32n) | BigInt(words[1])) & ((1n << 53n) - 1n);
  return (value === 0n ? 1n : value).toString();
}

function createSwapController({store, nexus, solana, validateFunding, loadScope} = {}) {
  if (!store || typeof store.exclusive !== 'function') throw new Error('Durable job store is required.');
  if (!nexus || !solana) throw new Error('Nexus and Solana adapters are required.');
  if (typeof validateFunding !== 'function' || typeof loadScope !== 'function') {
    throw new Error('Funding and scope validators are required.');
  }

  async function assertScope(job) {
    const current = await loadScope();
    if (!sameScope(job.scope, current)) throw new Error('Wallet/network scope changed; operation blocked.');
    return current;
  }

  function requireJob(tx, id) {
    const job = tx.get(id);
    if (!job) throw new Error('Swap job not found.');
    return job;
  }

  function exactEvidenceId(evidence, requested) {
    if (!evidence || typeof evidence !== 'object') return false;
    if (evidence.verified === false || evidence.resolved === false) return false;
    return evidence.signature === requested || evidence.txid === requested || evidence.sourceTxid === requested;
  }

  async function createJob(input) {
    if (!input || typeof input !== 'object') throw new Error('Swap intent is required.');
    await assertScope(input);
    return store.exclusive(input.scope, async tx => {
      const nexusMinConfirmations = input.nexusMinConfirmations === undefined
        ? DEFAULT_NEXUS_MIN_CONFIRMATIONS
        : input.nexusMinConfirmations;
      const expiresAt = input.expiresAt === undefined ? Date.now() + 15 * 60 * 1000 : input.expiresAt;
      const comparable = JSON.stringify({
        scope: input.scope,
        direction: input.direction,
        provider: input.provider,
        quote: input.quote,
        nexusAccount: input.nexusAccount,
        solanaAccount: input.solanaAccount,
        nexusMinConfirmations,
      });
      const existing = tx.list(input.scope).find(job => !['completed', 'cancelled'].includes(job.state)
        && JSON.stringify({
          scope: job.scope,
          direction: job.direction,
          provider: job.provider,
          quote: job.quote,
          nexusAccount: job.nexusAccount,
          solanaAccount: job.solanaAccount,
          nexusMinConfirmations: job.nexusMinConfirmations,
        }) === comparable);
      if (existing) return existing;
      const id = cryptography().randomUUID();
      const usedReferences = new Set(tx.list(input.scope).map(job => job.reference));
      let reference = randomReference();
      while (usedReferences.has(reference)) reference = randomReference();
      const created = tx.create({
        ...clone(input),
        nexusMinConfirmations,
        expiresAt,
        id,
        reference,
        state: 'draft',
        createdAt: new Date().toISOString(),
      });
      await tx.commit();
      return created;
    });
  }

  async function prepareSolana(id) {
    return store.exclusive(async tx => {
      const job = requireJob(tx, id);
      if (job.direction !== 'solana-to-nexus') throw new Error('This job does not use a Solana funding handoff.');
      await assertScope(job);
      if (job.state === 'awaiting_signature') return job;
      if (job.state !== 'draft') throw new Error(`Solana handoff is not allowed from ${job.state}.`);
      await validateFunding(clone(job));
      const updated = tx.update(id, current => ({...current, state: 'awaiting_signature', handoffAt: new Date().toISOString()}));
      await tx.commit();
      return updated;
    });
  }

  async function attachSource(id, txid, sourceContract) {
    requireText(txid, 'Source transaction id');
    return store.exclusive(async tx => {
      const job = requireJob(tx, id);
      await assertScope(job);
      if (job.sourceTxid) {
        if (job.sourceTxid === txid && (sourceContract === undefined || String(job.sourceContract || '') === String(sourceContract || ''))) return job;
        throw new Error('Source evidence is already attached.');
      }
      let evidence;
      if (job.direction === 'solana-to-nexus') {
        if (job.state !== 'awaiting_signature') throw new Error(`Source proof is not allowed from ${job.state}.`);
        evidence = await solana.verifyDeposit(txid, clone(job));
      } else {
        if (!['debit_submitted', 'mapping_unknown', 'awaiting_service_credit'].includes(job.state)) {
          throw new Error(`Source proof is not allowed from ${job.state}.`);
        }
        evidence = await nexus.inspectSource(clone(job), {txid, sourceContract, manual: true});
        await assertScope(job);
        if (!evidence || evidence.resolved !== true) throw new Error('Source transaction is not authoritatively resolved.');
        if (evidence.debitTxid !== job.debitTxid) throw new Error('Source proof does not match the submitted debit.');
      }
      await assertScope(job);
      if (!exactEvidenceId(evidence, txid)) throw new Error('Source proof does not match the requested transaction id.');
      const provenContract = evidence.sourceContract ?? evidence.contractId ?? evidence.contract ?? sourceContract;
      if (sourceContract !== undefined && String(provenContract ?? '') !== String(sourceContract)) {
        throw new Error('Source proof contract does not match.');
      }
      const updated = tx.update(id, current => ({
        ...current,
        sourceTxid: txid,
        ...(provenContract === undefined ? {} : {sourceContract: String(provenContract)}),
        sourceEvidence: clone(evidence),
        state: job.direction === 'nexus-to-solana' ? 'mapping_unknown' : 'awaiting_payout',
        sourceConfirmedAt: new Date().toISOString(),
      }));
      await tx.commit();
      return updated;
    });
  }

  async function submitNexus(id) {
    return store.exclusive(async tx => {
      let job = requireJob(tx, id);
      if (job.direction !== 'nexus-to-solana') throw new Error('This job does not use Nexus funding.');
      if (job.state !== 'draft') throw new Error(`Nexus debit cannot be submitted from ${job.state}; ambiguous submissions are never retried.`);
      await assertScope(job);
      await validateFunding(clone(job));

      job = tx.update(id, current => ({...current, state: 'submission_unknown', submissionStartedAt: new Date().toISOString()}));
      await tx.commit();
      const debit = await nexus.submitDebit(clone(job));
      await assertScope(job);
      if (!debit || typeof debit.txid !== 'string' || debit.txid.length === 0) {
        throw new Error('Nexus debit outcome is unknown; a remote transaction id was not returned.');
      }
      job = tx.update(id, current => ({...current, debitTxid: debit.txid, state: 'debit_submitted'}));
      await tx.commit();
      job = tx.update(id, current => ({...current, state: 'awaiting_service_credit'}));
      await tx.commit();
      return job;
    });
  }

  async function importNexusDebit(id, txid) {
    requireText(txid, 'Nexus debit transaction id');
    return store.exclusive(async tx => {
      const job = requireJob(tx, id);
      if (job.direction !== 'nexus-to-solana' || job.state !== 'submission_unknown') {
        throw new Error(`Nexus debit import is not allowed from ${job.state}.`);
      }
      await assertScope(job);
      const evidence = await nexus.verifyDebit(txid, clone(job));
      await assertScope(job);
      if (!evidence || evidence.verified !== true) throw new Error('Nexus debit proof is not verified.');
      if (!exactEvidenceId(evidence, txid)) throw new Error('Debit proof does not match the requested transaction id.');
      const updated = tx.update(id, current => ({
        ...current,
        debitTxid: txid,
        debitEvidence: clone(evidence),
        state: 'awaiting_service_credit',
      }));
      await tx.commit();
      return updated;
    });
  }

  async function inspect(id) {
    return store.exclusive(async tx => {
      const job = requireJob(tx, id);
      await assertScope(job);
      if (job.sourceTxid || !['debit_submitted', 'mapping_unknown', 'awaiting_service_credit'].includes(job.state)) return job;
      const evidence = await nexus.inspectSource(clone(job));
      await assertScope(job);
      if (!evidence || evidence.resolved !== true) return job;
      const sourceTxid = evidence.sourceTxid;
      if (typeof sourceTxid !== 'string' || sourceTxid.length === 0) {
        throw new Error('Resolved source observation omitted its transaction identity.');
      }
      if (evidence.debitTxid !== job.debitTxid) throw new Error('Resolved source proof does not match the submitted debit.');
      const sourceContract = evidence.contractId;
      if (sourceContract === undefined || sourceContract === null || String(sourceContract).length === 0) {
        throw new Error('Resolved source observation omitted its contract identity.');
      }
      const updated = tx.update(id, current => ({
        ...current,
        sourceTxid,
        sourceContract: String(sourceContract),
        sourceEvidence: clone(evidence),
        state: 'mapping_unknown',
        sourceConfirmedAt: new Date().toISOString(),
      }));
      await tx.commit();
      return updated;
    });
  }

  async function repairMapping(id) {
    return store.exclusive(async tx => {
      let job = requireJob(tx, id);
      if (job.direction !== 'nexus-to-solana' || job.state !== 'mapping_unknown' || !job.sourceTxid) {
        throw new Error(`Mapping repair is not allowed from ${job.state}.`);
      }
      await assertScope(job);
      if (job.mappingStartedAt && (!job.mappingAddress || !job.mappingTxid)) {
        throw new Error('Mapping create outcome is unknown; enter the exact mapping address and create transaction id for manual recovery.');
      }
      if (!job.mappingStartedAt) {
        job = tx.update(id, current => ({...current, mappingStartedAt: new Date().toISOString()}));
        await tx.commit();
      }
      const mapping = await nexus.publishMapping(clone(job), {allowCreate: !job.mappingAddress && !job.mappingTxid});
      await assertScope(job);
      if (!mapping || typeof mapping.address !== 'string' || mapping.address.length === 0) {
        throw new Error('Mapping publication outcome is unknown.');
      }
      const updated = tx.update(id, current => ({
        ...current,
        mappingAddress: mapping.address,
        ...(typeof mapping.txid === 'string' && mapping.txid ? {mappingTxid: mapping.txid} : {}),
        state: mapping.resolved === false ? 'mapping_unknown' : 'awaiting_payout',
        reason: mapping.resolved === false ? mapping.reason || 'Mapping readback is not verified.' : '',
      }));
      await tx.commit();
      return updated;
    });
  }

  async function recoverMapping(id, address, createTxid) {
    requireText(address, 'Mapping address');
    requireText(createTxid, 'Mapping create transaction id');
    return store.exclusive(async tx => {
      const job = requireJob(tx, id);
      if (job.direction !== 'nexus-to-solana' || job.state !== 'mapping_unknown' || !job.sourceTxid || !job.mappingStartedAt) {
        throw new Error(`Mapping recovery is not allowed from ${job.state}.`);
      }
      if ((job.mappingAddress && job.mappingAddress !== address) || (job.mappingTxid && job.mappingTxid !== createTxid)) {
        throw new Error('Manual mapping identity conflicts with the already persisted remote identity.');
      }
      await assertScope(job);
      const evidence = await nexus.verifyMapping(address, createTxid, clone(job));
      await assertScope(job);
      if (!evidence || evidence.verified !== true || evidence.address !== address || evidence.txid !== createTxid) {
        throw new Error('Mapping identity is not authoritatively verified.');
      }
      const updated = tx.update(id, current => ({
        ...current, mappingAddress: address, mappingTxid: createTxid,
        mappingEvidence: clone(evidence), state: 'awaiting_payout', reason: '',
      }));
      await tx.commit();
      return updated;
    });
  }

  async function cancel(id) {
    return store.exclusive(async tx => {
      const job = requireJob(tx, id);
      if (job.state !== 'draft') throw new Error(`Cancellation is allowed only before handoff, not from ${job.state}.`);
      await assertScope(job);
      const updated = tx.update(id, current => ({...current, state: 'cancelled', cancelledAt: new Date().toISOString()}));
      await tx.commit();
      return updated;
    });
  }

  async function complete(id, payoutTxid = null) {
    const observingNexus = payoutTxid === null || payoutTxid === undefined;
    if (!observingNexus) requireText(payoutTxid, 'Payout transaction id');
    return store.exclusive(async tx => {
      const job = requireJob(tx, id);
      if (observingNexus && job.direction !== 'solana-to-nexus') {
        throw new Error('A payout transaction id is required for Nexus-to-Solana completion.');
      }
      if (job.state === 'completed') {
        if (observingNexus || job.payoutTxid === payoutTxid) return job;
        throw new Error('Swap already completed with different evidence.');
      }
      if (job.state !== 'awaiting_payout') throw new Error(`Completion is not allowed from ${job.state}.`);
      await assertScope(job);
      const evidence = job.direction === 'solana-to-nexus'
        ? await nexus.verifyOutput(observingNexus ? null : payoutTxid, clone(job))
        : await solana.verifyPayout(payoutTxid, clone(job));
      await assertScope(job);
      let verifiedPayoutTxid = payoutTxid;
      if (job.direction === 'solana-to-nexus') {
        if (evidence && evidence.verified === false && evidence.pendingClaim === true) {
          const observedPayoutTxid = requireText(evidence.txid, 'Observed Nexus payout transaction id');
          if (!observingNexus && observedPayoutTxid !== payoutTxid) {
            throw new Error('Output proof does not match the requested payout id.');
          }
          const pending = tx.update(id, current => ({
            ...current,
            payoutTxid: observedPayoutTxid,
            payoutEvidence: clone(evidence),
            reason: evidence.reason || 'nexus_output_pending_claim',
            payoutObservedAt: new Date().toISOString(),
          }));
          await tx.commit();
          return pending;
        }
        if (!evidence || evidence.verified !== true) {
          throw new Error('Nexus output proof is not verified.');
        }
        verifiedPayoutTxid = requireText(evidence.txid, 'Verified Nexus payout transaction id');
        if (!observingNexus && verifiedPayoutTxid !== payoutTxid) {
          throw new Error('Output proof does not match the requested payout id.');
        }
      } else if (!exactEvidenceId(evidence, payoutTxid)) {
        throw new Error('Output proof does not match the requested payout id.');
      }
      const updated = tx.update(id, current => ({
        ...current,
        payoutTxid: verifiedPayoutTxid,
        payoutEvidence: clone(evidence),
        reason: '',
        state: 'completed',
        completedAt: new Date().toISOString(),
      }));
      await tx.commit();
      return updated;
    });
  }

  return {
    createJob,
    submitNexus,
    importNexusDebit,
    prepareSolana,
    attachSource,
    importSource: attachSource,
    inspect,
    repairMapping,
    recoverMapping,
    complete,
    cancel,
    list: scope => store.list(scope),
    get: id => store.get(id),
  };
}

module.exports = {createSwapController};
