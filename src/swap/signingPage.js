'use strict';

const {
  createSolanaClient,
  detectInjectedWallet,
  connectInjectedWallet,
  signAndSendTransaction,
} = require('./solana.js');
const { parseUnits } = require('./money.js');
const { NETWORKS, ACCEPTED_DEPLOYMENTS, assertDeploymentAccepted } = require('./deployment.js');

const JOB_FIELDS = new Set([
  'id', 'reference', 'scope', 'direction', 'provider', 'quote', 'nexusAccount', 'solanaAccount',
  'state', 'sourceTxid', 'sourceContract', 'payoutTxid', 'mappingAddress',
  'createdAt', 'updatedAt', 'expiresAt',
]);
const PROVIDER_FIELDS = new Set([
  'schema', 'address', 'owner', 'name', 'nexusToken', 'nexusTreasury', 'nexusSymbol',
  'solanaMint', 'solanaVault', 'solanaSymbol', 'memoPrefix', 'feeBps',
  'feeFlatToNexus', 'feeFlatToSolana', 'minToNexus', 'minToSolana', 'timestamp',
  'status', 'nexusDecimals', 'solanaDecimals', 'solanaVaultOwner', 'solanaGenesis',
  'nexusNetwork', 'verifiedVault', 'receiptSchema',
]);
const QUOTE_FIELDS = new Set(['inputUnits', 'outputUnits', 'feeUnits', 'inputAmount', 'outputAmount']);
const SCOPE_FIELDS = new Set(['genesis', 'solanaGenesis', 'nexusNetwork', 'walletGenesis', 'providerAddress']);

function assertOnlyFields(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) throw new TypeError(`${label} contains unsupported field ${key}`);
  }
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) throw new TypeError('job fragment is not valid base64url');
  if (typeof Buffer !== 'undefined') return Buffer.from(value, 'base64url').toString('utf8');
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  return decodeURIComponent(Array.from(atob(base64), (char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
}

function parsePublicJob(fragment, { now = Date.now() } = {}) {
  if (typeof fragment !== 'string' || !fragment.startsWith('#')) throw new TypeError('URL fragment must contain a public job');
  const params = new URLSearchParams(fragment.slice(1));
  if (params.size !== 1 || !params.has('job')) throw new TypeError('URL fragment may contain only the job field');
  let job;
  try { job = JSON.parse(decodeBase64Url(params.get('job'))); } catch (error) {
    throw new TypeError(`public job is invalid: ${error.message}`);
  }
  assertOnlyFields(job, JOB_FIELDS, 'job');
  assertOnlyFields(job.provider, PROVIDER_FIELDS, 'job.provider');
  assertOnlyFields(job.quote, QUOTE_FIELDS, 'job.quote');
  assertOnlyFields(job.scope, SCOPE_FIELDS, 'job.scope');
  if (typeof job.id !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(job.id)) throw new TypeError('job.id is invalid');
  if (job.direction !== 'solana-to-nexus') throw new TypeError('companion accepts only solana-to-nexus funding jobs');
  if (typeof job.nexusAccount !== 'string' || job.nexusAccount.length === 0) throw new TypeError('job.nexusAccount is required');
  if (!Number.isFinite(job.expiresAt) || job.expiresAt <= now) throw new Error('job is expired');
  if (job.expiresAt - now > 30 * 60 * 1000) throw new Error('job expiry exceeds the 30 minute safety limit');
  for (const field of ['inputUnits', 'outputUnits', 'feeUnits']) {
    if (typeof job.quote[field] !== 'string' || !/^(?:0|[1-9][0-9]*)$/.test(job.quote[field])) throw new TypeError(`job.quote.${field} is invalid`);
  }
  if (job.quote.inputUnits === '0') throw new TypeError('job.quote.inputUnits must be positive');
  for (const field of ['inputAmount', 'outputAmount']) {
    if (typeof job.quote[field] !== 'string' || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(job.quote[field])) throw new TypeError(`job.quote.${field} is invalid`);
  }
  const providerStrings = ['solanaMint', 'solanaVault', 'solanaVaultOwner', 'solanaGenesis', 'memoPrefix', 'solanaSymbol', 'nexusSymbol', 'nexusNetwork'];
  for (const field of providerStrings) {
    if (typeof job.provider[field] !== 'string' || !job.provider[field]) throw new TypeError(`job.provider.${field} is required`);
  }
  if (!Number.isInteger(job.provider.solanaDecimals)) throw new TypeError('job.provider.solanaDecimals is invalid');
  if (!Number.isInteger(job.provider.nexusDecimals)) throw new TypeError('job.provider.nexusDecimals is invalid');
  if (job.scope.solanaGenesis !== job.provider.solanaGenesis || job.scope.nexusNetwork !== job.provider.nexusNetwork) {
    throw new Error('job scope does not match provider network terms');
  }
  if (parseUnits(job.quote.inputAmount, job.provider.solanaDecimals) !== BigInt(job.quote.inputUnits)) {
    throw new Error('job.quote.inputAmount does not exactly match inputUnits');
  }
  if (parseUnits(job.quote.outputAmount, job.provider.nexusDecimals) !== BigInt(job.quote.outputUnits)) {
    throw new Error('job.quote.outputAmount does not exactly match outputUnits');
  }
  return Object.freeze({ ...job, scope: Object.freeze({ ...job.scope }), provider: Object.freeze({ ...job.provider }), quote: Object.freeze({ ...job.quote }) });
}

function validateEndpoint(value, allowedOrigins) {
  let url;
  try { url = new URL(value); } catch (_) { throw new TypeError('endpoint must be an absolute URL'); }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.username || url.password) throw new TypeError('endpoint credentials are forbidden');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new TypeError('endpoint must use HTTPS or localhost HTTP');
  if (Array.isArray(allowedOrigins) && allowedOrigins.length > 0 && !allowedOrigins.includes(url.origin)) {
    throw new Error('endpoint origin is not in the deployment allowlist');
  }
  return url;
}

function resolveDeployment(job, networks = NETWORKS, acceptedDeployments = ACCEPTED_DEPLOYMENTS) {
  const network = Object.values(networks).find((candidate) => candidate && candidate.genesis === job.scope.solanaGenesis);
  if (!network) throw new Error('job Solana cluster has no reviewed deployment RPC');
  if (job.direction === 'solana-to-nexus' && job.provider.receiptSchema !== 'nexus-swap-receipt-v1') {
    throw new Error('provider does not advertise the reviewed source-bound receipt schema');
  }
  const endpoint = validateEndpoint(network.rpcUrl);
  const acceptance = assertDeploymentAccepted(job, acceptedDeployments);
  return Object.freeze({ ...network, rpcUrl: endpoint.toString(), acceptance });
}

function setText(documentObject, id, value) {
  const element = documentObject.getElementById(id);
  if (element) element.textContent = value;
}

function renderTerms(documentObject, job, endpoint) {
  setText(documentObject, 'job-id', job.id);
  setText(documentObject, 'provider-name', job.provider.name || job.provider.address || 'Reviewed provider');
  setText(documentObject, 'input-terms', `${job.quote.inputAmount} ${job.provider.solanaSymbol} (${job.quote.inputUnits} base units)`);
  setText(documentObject, 'output-terms', `${job.quote.outputAmount} ${job.provider.nexusSymbol} (${job.quote.outputUnits} base units)`);
  setText(documentObject, 'fee-terms', `${job.quote.feeUnits} base units`);
  setText(documentObject, 'nexus-account', job.nexusAccount);
  setText(documentObject, 'mint', job.provider.solanaMint);
  setText(documentObject, 'vault', job.provider.solanaVault);
  setText(documentObject, 'vault-owner', job.provider.solanaVaultOwner);
  setText(documentObject, 'cluster', `${job.provider.solanaGenesis} via ${endpoint.origin}`);
  setText(documentObject, 'memo', `${job.provider.memoPrefix}${job.nexusAccount}`);
  setText(documentObject, 'expiry', new Date(job.expiresAt).toISOString());
  setText(documentObject, 'custody', 'Non-custodial: your wallet signs a newly constructed SPL Token transfer. This page never receives a private key.');
}

function attemptedKey(job) {
  return `dex.solana-sign.attempt.${job.id}`;
}

function storeAttempt(storage, job, state) {
  const record = { jobId: job.id, state, attemptedAt: new Date().toISOString() };
  const serialized = JSON.stringify(record);
  storage.setItem(attemptedKey(job), serialized);
  if (storage.getItem(attemptedKey(job)) !== serialized) throw new Error('could not persist funding attempt');
}

function readAttempt(storage, job) {
  const serialized = storage.getItem(attemptedKey(job));
  if (serialized === null) return null;
  try {
    const record = JSON.parse(serialized);
    return record && record.jobId === job.id && typeof record.state === 'string'
      ? record
      : { jobId: job.id, state: 'attempted' };
  } catch (_) {
    return { jobId: job.id, state: 'attempted' };
  }
}

async function initializeSigningPage({
  windowObject = window,
  documentObject = document,
  now = Date.now(),
  networks = NETWORKS,
  acceptedDeployments = ACCEPTED_DEPLOYMENTS,
  clientFactory = createSolanaClient,
  preferredWallet,
} = {}) {
  validateEndpoint(windowObject.location.href);
  const displayedFragment = windowObject.location.hash;
  const job = parsePublicJob(displayedFragment, { now });
  const deployment = resolveDeployment(job, networks, acceptedDeployments);
  const endpoint = validateEndpoint(deployment.rpcUrl);
  renderTerms(documentObject, job, endpoint);
  const client = clientFactory({ rpcUrl: endpoint.toString() });
  const pair = await client.loadPair(job.provider);
  if (pair.solanaGenesis !== deployment.genesis) throw new Error('RPC cluster does not match the reviewed network policy');
  if (pair.solanaVault !== job.provider.solanaVault || pair.solanaMint !== job.provider.solanaMint) throw new Error('on-chain pair does not match public job');

  const connectButton = documentObject.getElementById('connect-wallet');
  const approveButton = documentObject.getElementById('approve-transfer');
  const sourceSelect = documentObject.getElementById('source-account');
  const copyButton = documentObject.getElementById('copy-signature');
  const signatureOutput = documentObject.getElementById('signature');
  const status = (message) => setText(documentObject, 'status', message);
  const locks = windowObject.navigator && windowObject.navigator.locks;
  const locksAvailable = Boolean(locks && typeof locks.request === 'function');
  let connected;

  const storedAttempt = readAttempt(windowObject.localStorage, job);
  if (storedAttempt) {
    approveButton.disabled = true;
    if (typeof storedAttempt.signature === 'string' && storedAttempt.signature.length > 0) {
      signatureOutput.value = storedAttempt.signature;
      copyButton.disabled = false;
      status('This job was already submitted in this browser. Copy the stored signature and return it to the Nexus wallet.');
    } else {
      status('This job was already attempted in this browser. Do not send again; resolve the prior signature manually.');
    }
  } else if (!locksAvailable) {
    approveButton.disabled = true;
    status('Signing unavailable: this browser must provide the Web Locks API for an acknowledged exclusive job lock.');
  }

  connectButton.addEventListener('click', async () => {
    try {
      const detected = detectInjectedWallet(windowObject, preferredWallet);
      if (!detected) throw new Error('Phantom or Solflare was not detected');
      connected = await connectInjectedWallet(detected);
      const sources = await client.findSourceTokenAccounts(connected.publicKey, pair.solanaMint, job.quote.inputUnits);
      if (sources.length === 0) throw new Error('connected wallet has no eligible token account with sufficient units');
      sourceSelect.replaceChildren(...sources.map((source) => {
        const option = documentObject.createElement('option');
        option.value = source.address;
        option.textContent = `${source.address} — ${source.units} units${source.isAssociated ? ' (associated)' : ''}`;
        return option;
      }));
      sourceSelect.disabled = false;
      approveButton.disabled = !locksAvailable || Boolean(readAttempt(windowObject.localStorage, job));
      status(`Connected ${connected.name}: ${connected.publicKey.toBase58()}`);
    } catch (error) { status(error.message); }
  });

  approveButton.addEventListener('click', async () => {
    approveButton.disabled = true;
    try {
      if (!locksAvailable) throw new Error('Web Locks API is required for an acknowledged exclusive job lock');
      if (windowObject.location.hash !== displayedFragment) throw new Error('public job changed after the displayed terms were rendered; refusing to sign');
      const freshJob = parsePublicJob(displayedFragment);
      assertDeploymentAccepted(freshJob, acceptedDeployments);
      if (!connected) throw new Error('connect a supported wallet first');
      const freshPair = await client.loadPair(freshJob.provider);
      if (freshPair.solanaGenesis !== pair.solanaGenesis || freshPair.solanaVault !== pair.solanaVault || freshPair.solanaMint !== pair.solanaMint) {
        throw new Error('provider terms changed; refusing to sign');
      }
      const built = await client.buildDepositTransaction({
        provider: freshPair,
        nexusAccount: freshJob.nexusAccount,
        inputUnits: freshJob.quote.inputUnits,
        walletPublicKey: connected.publicKey,
        sourceTokenAccount: sourceSelect.value,
      });
      let acknowledged = false;
      await locks.request(`dex.solana-sign.job.${job.id}`, { mode: 'exclusive' }, async (lock) => {
        if (!lock || lock.name !== `dex.solana-sign.job.${job.id}` || lock.mode !== 'exclusive') {
          throw new Error('browser did not acknowledge the required exclusive job lock');
        }
        acknowledged = true;
        if (windowObject.location.hash !== displayedFragment) throw new Error('public job changed after the displayed terms were rendered; refusing to sign');
        const lockedJob = parsePublicJob(displayedFragment);
        assertDeploymentAccepted(lockedJob, acceptedDeployments);
        if (readAttempt(windowObject.localStorage, job)) throw new Error('this job was already attempted; do not submit it twice');
        storeAttempt(windowObject.localStorage, job, 'attempted');
        status('Funding was attempted. Approve only the displayed terms in your wallet. Do not retry if the wallet response is lost.');
        const result = await signAndSendTransaction({ wallet: connected.provider, transaction: built.transaction, connection: client.connection });
        if (result.signature) {
          const record = { jobId: job.id, state: 'submitted', signature: result.signature, attemptedAt: new Date().toISOString() };
          windowObject.localStorage.setItem(attemptedKey(job), JSON.stringify(record));
          signatureOutput.value = result.signature;
          copyButton.disabled = false;
          status('Submitted. Copy the signature and return it manually to the Nexus wallet. Completion still requires finalized evidence.');
        } else {
          status(`Outcome unknown: ${result.reason || 'wallet response was lost'}. Do not retry. Inspect wallet history and return the signature manually.`);
        }
      });
      if (!acknowledged) throw new Error('browser did not acknowledge the required exclusive job lock');
    } catch (error) {
      status(error.message);
      if (locksAvailable && !readAttempt(windowObject.localStorage, job)) approveButton.disabled = false;
    }
  });

  copyButton.addEventListener('click', async () => {
    if (signatureOutput.value) await windowObject.navigator.clipboard.writeText(signatureOutput.value);
  });

  const payLink = documentObject.getElementById('solana-pay');
  if (payLink) {
    payLink.removeAttribute('href');
    payLink.hidden = true;
  }
  return { job, pair, client };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    initializeSigningPage().catch((error) => {
      setText(document, 'status', `Signer unavailable: ${error.message}`);
      const approve = document.getElementById('approve-transfer');
      if (approve) approve.disabled = true;
    });
  });
}

module.exports = {
  parsePublicJob,
  validateEndpoint,
  resolveDeployment,
  renderTerms,
  initializeSigningPage,
};
