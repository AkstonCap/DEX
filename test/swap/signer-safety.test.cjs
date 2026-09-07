'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { Keypair } = require('@solana/web3.js');
const { initializeSigningPage } = require('../../src/swap/signingPage.js');

const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

function element() {
  const listeners = new Map();
  return {
    disabled: false,
    hidden: true,
    href: '',
    textContent: '',
    value: '',
    addEventListener(type, handler) { listeners.set(type, handler); },
    async click() { return listeners.get('click')?.(); },
    replaceChildren(...children) {
      this.children = children;
      this.value = children[0]?.value || '';
    },
    removeAttribute(name) { if (name === 'href') this.href = ''; },
  };
}

function fakeDocument() {
  const ids = [
    'job-id', 'provider-name', 'input-terms', 'output-terms', 'fee-terms',
    'nexus-account', 'mint', 'vault', 'vault-owner', 'cluster', 'memo', 'expiry',
    'custody', 'connect-wallet', 'approve-transfer', 'source-account',
    'copy-signature', 'signature', 'status', 'solana-pay',
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, element()]));
  elements['approve-transfer'].disabled = true;
  elements['copy-signature'].disabled = true;
  return {
    elements,
    getElementById(id) { return elements[id] || null; },
    createElement() { return element(); },
  };
}

function sharedStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

function exclusiveLocks() {
  const tails = new Map();
  return {
    async request(name, options, callback) {
      assert.deepEqual(options, { mode: 'exclusive' });
      const prior = tails.get(name) || Promise.resolve();
      let release;
      const next = new Promise((resolve) => { release = resolve; });
      tails.set(name, prior.then(() => next));
      await prior;
      try { return await callback({ name, mode: 'exclusive' }); } finally { release(); }
    },
  };
}

function publicJob(overrides = {}) {
  const mint = Keypair.generate().publicKey.toBase58();
  const vault = Keypair.generate().publicKey.toBase58();
  const owner = Keypair.generate().publicKey.toBase58();
  const provider = {
    schema: 'recommended-v1',
    address: 'provider-record',
    owner: 'provider-owner',
    name: 'Reviewed bridge',
    nexusToken: 'TOKEN',
    nexusTreasury: 'TREASURY',
    nexusSymbol: 'USDD',
    solanaMint: mint,
    solanaVault: vault,
    solanaSymbol: 'USDC',
    memoPrefix: 'nexus:',
    feeBps: '25',
    feeFlatToNexus: '0',
    feeFlatToSolana: '0',
    minToNexus: '1',
    minToSolana: '1',
    timestamp: '2026-09-07T00:00:00.000Z',
    status: 'active',
    nexusDecimals: 6,
    solanaDecimals: 6,
    solanaVaultOwner: owner,
    solanaGenesis: MAINNET_GENESIS,
    nexusNetwork: 'LLL-TAO-mainnet',
    receiptSchema: 'nexus-swap-receipt-v1',
  };
  return {
    id: 'job-signer-safety',
    reference: 'public-reference',
    scope: { genesis: 'wallet-genesis', nexusNetwork: provider.nexusNetwork, solanaGenesis: provider.solanaGenesis },
    direction: 'solana-to-nexus',
    nexusAccount: 'alice',
    expiresAt: Date.now() + 10 * 60 * 1000,
    provider,
    quote: { inputUnits: '500', outputUnits: '490', feeUnits: '10', inputAmount: '0.0005', outputAmount: '0.00049' },
    ...overrides,
  };
}

function fragment(job) {
  return `#job=${Buffer.from(JSON.stringify(job)).toString('base64url')}`;
}

function acceptedFor(job) {
  return [{
    address: job.provider.address,
    owner: job.provider.owner,
    nexusToken: job.provider.nexusToken,
    nexusTreasury: job.provider.nexusTreasury,
    solanaMint: job.provider.solanaMint,
    solanaVault: job.provider.solanaVault,
    nexusNetwork: job.provider.nexusNetwork,
    solanaGenesis: job.provider.solanaGenesis,
    directions: ['solana-to-nexus'],
    dustToNexusUnits: '1',
    evidence: 'acceptance/report.md',
  }];
}

function pageHarness({ job, storage, locks, counters, buildGate }) {
  const documentObject = fakeDocument();
  const walletKey = Keypair.generate().publicKey;
  const wallet = {
    isPhantom: true,
    publicKey: walletKey,
    isConnected: true,
    async connect() { return { publicKey: walletKey }; },
    async signAndSendTransaction() {
      counters.signs += 1;
      return { signature: `signature-${counters.signs}` };
    },
  };
  const location = { href: `https://signer.example.test/${fragment(job)}`, hash: fragment(job) };
  const windowObject = {
    location,
    localStorage: storage,
    navigator: {
      ...(locks ? { locks } : {}),
      clipboard: { async writeText(value) { counters.copied = value; } },
    },
    phantom: { solana: wallet },
  };
  const client = {
    connection: {},
    async loadPair(provider) { return { ...provider, verifiedVault: 'auxiliary' }; },
    async findSourceTokenAccounts() { return [{ address: Keypair.generate().publicKey.toBase58(), units: '500', isAssociated: true }]; },
    async buildDepositTransaction({ walletPublicKey }) {
      counters.builds += 1;
      if (buildGate) await buildGate();
      return { transaction: { feePayer: walletPublicKey } };
    },
  };
  const initialize = () => initializeSigningPage({
    windowObject,
    documentObject,
    networks: { mainnet: { genesis: MAINNET_GENESIS, rpcUrl: 'https://rpc.reviewed.test' } },
    acceptedDeployments: acceptedFor(job),
    clientFactory: () => client,
  });
  return { documentObject, windowObject, initialize };
}

async function connectAndApprove(page) {
  await page.documentObject.elements['connect-wallet'].click();
  await page.documentObject.elements['approve-transfer'].click();
}

test('two same-origin page handlers serialize one job and invoke the wallet signer once', async () => {
  const job = publicJob();
  const storage = sharedStorage();
  const locks = exclusiveLocks();
  const counters = { signs: 0, builds: 0 };
  let arrivals = 0;
  let releaseBuilds;
  const bothBuilt = new Promise((resolve) => { releaseBuilds = resolve; });
  const buildGate = async () => {
    arrivals += 1;
    if (arrivals === 2) releaseBuilds();
    await bothBuilt;
  };
  const pages = [
    pageHarness({ job, storage, locks, counters, buildGate }),
    pageHarness({ job, storage, locks, counters, buildGate }),
  ];
  await Promise.all(pages.map((page) => page.initialize()));
  await Promise.all(pages.map(connectAndApprove));

  assert.equal(counters.builds, 2);
  assert.equal(counters.signs, 1);
  const record = JSON.parse(storage.getItem(`dex.solana-sign.attempt.${job.id}`));
  assert.equal(record.state, 'submitted');
  assert.equal(record.signature, 'signature-1');
});

test('signing fails closed when the Web Locks API is unavailable', async () => {
  const job = publicJob();
  const counters = { signs: 0, builds: 0 };
  const page = pageHarness({ job, storage: sharedStorage(), locks: null, counters });
  await page.initialize();
  await connectAndApprove(page);
  assert.equal(counters.signs, 0);
  assert.match(page.documentObject.elements.status.textContent, /Web Locks|exclusive lock/i);
});

test('reload renders a locally stored submitted signature and enables copy', async () => {
  const job = publicJob();
  const storage = sharedStorage();
  storage.setItem(`dex.solana-sign.attempt.${job.id}`, JSON.stringify({
    jobId: job.id,
    state: 'submitted',
    signature: 'stored-signature',
    attemptedAt: new Date().toISOString(),
  }));
  const counters = { signs: 0, builds: 0, copied: null };
  const page = pageHarness({ job, storage, locks: exclusiveLocks(), counters });
  await page.initialize();

  assert.equal(page.documentObject.elements.signature.value, 'stored-signature');
  assert.equal(page.documentObject.elements['copy-signature'].disabled, false);
  await page.documentObject.elements['copy-signature'].click();
  assert.equal(counters.copied, 'stored-signature');
  assert.match(page.documentObject.elements.status.textContent, /stored|submitted/i);
});

test('changing the public job fragment after rendering is rejected before wallet signing', async () => {
  const job = publicJob();
  const storage = sharedStorage();
  const counters = { signs: 0, builds: 0 };
  const page = pageHarness({ job, storage, locks: exclusiveLocks(), counters });
  await page.initialize();
  await page.documentObject.elements['connect-wallet'].click();
  const changedJob = { ...job, nexusAccount: 'mallory' };
  page.windowObject.location.hash = fragment(changedJob);
  page.windowObject.location.href = `https://signer.example.test/${fragment(changedJob)}`;
  await page.documentObject.elements['approve-transfer'].click();

  assert.equal(counters.signs, 0);
  assert.equal(storage.getItem(`dex.solana-sign.attempt.${job.id}`), null);
  assert.match(page.documentObject.elements.status.textContent, /changed|displayed terms/i);
});
