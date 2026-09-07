'use strict';

const JOURNAL_VERSION = 1;
const LOCK_NAME = 'dex-swap-job-journal-v1';
const MAX_JOBS = 500;
const MAX_JOB_BYTES = 64 * 1024;
const MAX_JOURNAL_BYTES = 850 * 1024;
const DEFAULT_NEXUS_MIN_CONFIRMATIONS = 6;
const JOB_STATES = Object.freeze([
  'draft',
  'awaiting_signature',
  'submission_unknown',
  'debit_submitted',
  'mapping_unknown',
  'awaiting_service_credit',
  'awaiting_payout',
  'completed',
  'cancelled',
]);
const IMMUTABLE_FIELDS = Object.freeze([
  'id', 'reference', 'scope', 'direction', 'provider', 'quote', 'nexusAccount', 'solanaAccount',
  'nexusMinConfirmations', 'expiresAt',
]);
const SECRET_KEY = /(?:private.?key|secret|seed|mnemonic|passphrase|password|credential|auth.?token)/i;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function byteLength(value) {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function assertNoSecrets(value, path = 'job') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) throw new Error(`Secret field ${path}.${key} cannot be stored.`);
    assertNoSecrets(child, `${path}.${key}`);
  }
}

function scopeKey(scope) {
  if (!isRecord(scope)) throw new Error('Job scope is required.');
  const keys = ['genesis', 'nexusNetwork', 'solanaGenesis'];
  for (const key of keys) {
    if (typeof scope[key] !== 'string' || scope[key].length === 0) {
      throw new Error(`Job scope ${key} is required.`);
    }
  }
  return keys.map(key => scope[key]).join('\u0000');
}

function sourceKey(job) {
  if (typeof job.sourceTxid !== 'string' || job.sourceTxid.length === 0) return null;
  const contract = job.sourceContract === undefined || job.sourceContract === null
    ? ''
    : String(job.sourceContract);
  return `${job.sourceTxid}\u0000${contract}`;
}

function validateJob(job) {
  if (!isRecord(job)) throw new Error('Malformed swap job.');
  if (typeof job.id !== 'string' || job.id.length === 0 || job.id.length > 200) throw new Error('Swap job id is required.');
  if (job.direction !== 'solana-to-nexus' && job.direction !== 'nexus-to-solana') throw new Error('Invalid swap direction.');
  if (!JOB_STATES.includes(job.state)) throw new Error('Invalid swap job state.');
  scopeKey(job.scope);
  if (!isRecord(job.provider) || !isRecord(job.quote)) throw new Error('Swap provider and quote are required.');
  if (typeof job.nexusAccount !== 'string' || typeof job.solanaAccount !== 'string') throw new Error('Swap accounts are required.');
  if (!Number.isInteger(job.nexusMinConfirmations)
      || job.nexusMinConfirmations < DEFAULT_NEXUS_MIN_CONFIRMATIONS) {
    throw new Error(`job.nexusMinConfirmations must be an integer of at least ${DEFAULT_NEXUS_MIN_CONFIRMATIONS}.`);
  }
  if (!Number.isSafeInteger(job.expiresAt) || job.expiresAt <= 0) {
    throw new Error('job.expiresAt must be a positive safe-integer timestamp.');
  }
  assertNoSecrets(job);
  if (byteLength(job) > MAX_JOB_BYTES) throw new Error('Swap job exceeds storage limit.');
}

function validateJournal(journal) {
  if (!isRecord(journal) || journal.version !== JOURNAL_VERSION || !Array.isArray(journal.jobs)) {
    throw new Error('Malformed or unsupported swap journal; funding blocked.');
  }
  if (journal.jobs.length > MAX_JOBS || byteLength(journal) > MAX_JOURNAL_BYTES) {
    throw new Error('Swap journal exceeds storage limit; funding blocked.');
  }
  const ids = new Set();
  const sources = new Set();
  for (const job of journal.jobs) {
    validateJob(job);
    if (ids.has(job.id)) throw new Error('Duplicate swap job id; funding blocked.');
    ids.add(job.id);
    const source = sourceKey(job);
    if (source && sources.has(source)) throw new Error('Duplicate source evidence; funding blocked.');
    if (source) sources.add(source);
  }
  return journal;
}

function same(value, other) {
  return JSON.stringify(value) === JSON.stringify(other);
}

function assertImmutable(previous, next) {
  for (const field of IMMUTABLE_FIELDS) {
    if (!same(previous[field], next[field])) throw new Error(`Swap intent ${field} is immutable.`);
  }
  for (const field of ['sourceTxid', 'sourceContract', 'debitTxid', 'payoutTxid', 'mappingAddress', 'mappingTxid']) {
    if (previous[field] !== undefined && !same(previous[field], next[field])) {
      throw new Error(`Swap source/remote identity ${field} is immutable once recorded.`);
    }
  }
}

function createJobStore({persistence, locks} = {}) {
  if (!persistence || typeof persistence.readJournal !== 'function' || typeof persistence.writeJournal !== 'function') {
    throw new Error('Durable swap persistence is required.');
  }
  if (!locks || typeof locks.request !== 'function') {
    throw new Error('A cross-controller WebLock implementation is required.');
  }

  function read() {
    return clone(validateJournal(persistence.readJournal()));
  }

  async function exclusive(scope, callback) {
    if (typeof scope === 'function') {
      callback = scope;
      scope = null;
    }
    if (scope !== null && scope !== undefined) scopeKey(scope);
    if (typeof callback !== 'function') throw new Error('Exclusive callback is required.');

    return locks.request(LOCK_NAME, {mode: 'exclusive'}, async () => {
      const working = read();
      let dirty = false;
      const tx = {
        list(selectedScope) {
          const wanted = scopeKey(selectedScope);
          return clone(working.jobs.filter(item => scopeKey(item.scope) === wanted));
        },
        get(id) {
          const found = working.jobs.find(item => item.id === id);
          return found ? clone(found) : null;
        },
        create(job) {
          const next = clone(job);
          validateJob(next);
          if (working.jobs.some(item => item.id === next.id)) throw new Error('Swap job id already exists.');
          working.jobs.push(next);
          validateJournal(working);
          dirty = true;
          return clone(next);
        },
        update(id, updater) {
          const index = working.jobs.findIndex(item => item.id === id);
          if (index < 0) throw new Error('Swap job not found.');
          const previous = working.jobs[index];
          const candidate = typeof updater === 'function' ? updater(clone(previous)) : updater;
          const next = clone(candidate);
          assertImmutable(previous, next);
          working.jobs[index] = next;
          validateJournal(working);
          dirty = true;
          return clone(next);
        },
        async commit() {
          if (!dirty) return;
          validateJournal(working);
          const acknowledgement = persistence.writeJournal(clone(working));
          if (!acknowledgement || typeof acknowledgement.then !== 'function') {
            throw new Error('Durable journal write acknowledgement is required.');
          }
          const result = await acknowledgement;
          if (result === false || (result && typeof result === 'object' && result.error)) {
            throw new Error('Durable journal write was rejected.');
          }
          dirty = false;
        },
      };
      const result = await callback(tx);
      await tx.commit();
      return result;
    });
  }

  return {
    list(scope) {
      const wanted = scopeKey(scope);
      return clone(read().jobs.filter(item => scopeKey(item.scope) === wanted));
    },
    get(id) {
      const found = read().jobs.find(item => item.id === id);
      return found ? clone(found) : null;
    },
    create(job) {
      return exclusive(job.scope, async tx => {
        const created = tx.create(job);
        await tx.commit();
        return created;
      });
    },
    update(id, updater) {
      return exclusive(async tx => {
        const updated = tx.update(id, updater);
        await tx.commit();
        return updated;
      });
    },
    exclusive,
  };
}

module.exports = {
  createJobStore, JOURNAL_VERSION, JOB_STATES, DEFAULT_NEXUS_MIN_CONFIRMATIONS,
};
