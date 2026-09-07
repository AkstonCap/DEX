'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  Keypair,
  PublicKey,
} = require('@solana/web3.js');
const {
  AccountLayout,
  MintLayout,
  TOKEN_PROGRAM_ID,
  decodeTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} = require('@solana/spl-token');

const {
  MEMO_PROGRAM_ID,
  createSolanaClient,
  detectInjectedWallet,
  signAndSendTransaction,
  makeSolanaPayUrl,
} = require('../../src/swap/solana.js');
const {
  parsePublicJob,
  validateEndpoint,
  resolveDeployment,
} = require('../../src/swap/signingPage.js');

const keys = () => Keypair.generate().publicKey;

function tokenAccountInfo(mint, owner, amount = 10000000n) {
  const data = Buffer.alloc(AccountLayout.span);
  AccountLayout.encode({
    mint,
    owner,
    amount,
    delegateOption: 0,
    delegate: PublicKey.default,
    state: 1,
    isNativeOption: 0,
    isNative: 0n,
    delegatedAmount: 0n,
    closeAuthorityOption: 0,
    closeAuthority: PublicKey.default,
  }, data);
  return { data, executable: false, lamports: 2039280, owner: TOKEN_PROGRAM_ID };
}

function mintAccountInfo(decimals = 6) {
  const data = Buffer.alloc(MintLayout.span);
  MintLayout.encode({
    mintAuthorityOption: 0,
    mintAuthority: PublicKey.default,
    supply: 1000000000n,
    decimals,
    isInitialized: true,
    freezeAuthorityOption: 0,
    freezeAuthority: PublicKey.default,
  }, data);
  return { data, executable: false, lamports: 1461600, owner: TOKEN_PROGRAM_ID };
}

function fixture({ auxiliary = true } = {}) {
  const mint = keys();
  const vaultOwner = keys();
  const vault = auxiliary ? keys() : getAssociatedTokenAddressSync(mint, vaultOwner);
  const wallet = keys();
  const source = getAssociatedTokenAddressSync(mint, wallet);
  const provider = {
    schema: 'recommended-v1',
    address: 'provider-record',
    owner: 'provider-owner',
    name: 'Test bridge',
    nexusToken: 'TOKEN',
    nexusTreasury: 'TREASURY',
    nexusSymbol: 'USDD',
    solanaMint: mint.toBase58(),
    solanaVault: vault.toBase58(),
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
    solanaVaultOwner: vaultOwner.toBase58(),
    solanaGenesis: 'genesis-test',
    nexusNetwork: 'LLL-TAO-test',
  };
  const accounts = new Map([
    [mint.toBase58(), mintAccountInfo(6)],
    [vault.toBase58(), tokenAccountInfo(mint, vaultOwner)],
    [source.toBase58(), tokenAccountInfo(mint, wallet)],
  ]);
  const connection = {
    getGenesisHash: async () => 'genesis-test',
    getAccountInfo: async (key) => accounts.get(key.toBase58()) || null,
    getLatestBlockhash: async () => ({ blockhash: keys().toBase58(), lastValidBlockHeight: 123 }),
  };
  return { mint, vaultOwner, vault, wallet, source, provider, accounts, connection };
}

function parsedTransaction({ mint, source, destination, authority, amount, memo, destinationOwner }) {
  return {
    slot: 77,
    blockTime: 1788739200,
    meta: {
      err: null,
      preTokenBalances: [
        { accountIndex: 0, mint: mint.toBase58(), owner: authority.toBase58(), uiTokenAmount: { amount: String(amount), decimals: 6 } },
        { accountIndex: 1, mint: mint.toBase58(), owner: destinationOwner.toBase58(), uiTokenAmount: { amount: '0', decimals: 6 } },
      ],
      postTokenBalances: [
        { accountIndex: 0, mint: mint.toBase58(), owner: authority.toBase58(), uiTokenAmount: { amount: '0', decimals: 6 } },
        { accountIndex: 1, mint: mint.toBase58(), owner: destinationOwner.toBase58(), uiTokenAmount: { amount: String(amount), decimals: 6 } },
      ],
      innerInstructions: [],
    },
    transaction: {
      message: {
        accountKeys: [
          { pubkey: source, signer: false, writable: true },
          { pubkey: destination, signer: false, writable: true },
          { pubkey: authority, signer: true, writable: false },
        ],
        instructions: [
          {
            program: 'spl-token',
            programId: TOKEN_PROGRAM_ID,
            parsed: {
              type: 'transferChecked',
              info: {
                source: source.toBase58(),
                destination: destination.toBase58(),
                mint: mint.toBase58(),
                authority: authority.toBase58(),
                tokenAmount: { amount: String(amount), decimals: 6 },
              },
            },
          },
          { program: 'spl-memo', programId: MEMO_PROGRAM_ID, parsed: memo },
        ],
      },
      signatures: ['signature'],
    },
  };
}

test('buildDepositTransaction uses real TransferChecked serialization and supports an auxiliary vault', async () => {
  const f = fixture({ auxiliary: true });
  const client = createSolanaClient({ rpcUrl: 'https://rpc.example.test', connection: f.connection });
  const built = await client.buildDepositTransaction({
    provider: f.provider,
    nexusAccount: 'NEXUS-ACCOUNT',
    inputUnits: '1234567',
    walletPublicKey: f.wallet.toBase58(),
  });

  assert.equal(built.sourceTokenAccount, f.source.toBase58());
  assert.equal(built.destinationTokenAccount, f.vault.toBase58());
  assert.equal(built.memo, 'nexus:NEXUS-ACCOUNT');
  assert.equal(built.transaction.feePayer.toBase58(), f.wallet.toBase58());
  assert.equal(built.transaction.instructions.length, 2);
  const decoded = decodeTransferCheckedInstruction(built.transaction.instructions[0]);
  assert.equal(decoded.keys.source.pubkey.toBase58(), f.source.toBase58());
  assert.equal(decoded.keys.destination.pubkey.toBase58(), f.vault.toBase58());
  assert.equal(decoded.keys.owner.pubkey.toBase58(), f.wallet.toBase58());
  assert.equal(decoded.data.amount, 1234567n);
  assert.equal(decoded.data.decimals, 6);
  assert.equal(built.transaction.instructions[1].programId.toBase58(), MEMO_PROGRAM_ID.toBase58());
  assert.equal(built.transaction.instructions[1].data.toString('utf8'), 'nexus:NEXUS-ACCOUNT');
  assert.ok(built.transaction.serializeMessage().length > 0);
});

test('buildDepositTransaction validates a selected existing source token account authority', async () => {
  const f = fixture();
  const selected = keys();
  f.accounts.set(selected.toBase58(), tokenAccountInfo(f.mint, f.wallet, 1234567n));
  const client = createSolanaClient({ rpcUrl: 'https://rpc.example.test', connection: f.connection });
  const built = await client.buildDepositTransaction({ provider: f.provider, nexusAccount: 'acct', inputUnits: '5', walletPublicKey: f.wallet, sourceTokenAccount: selected });
  assert.equal(built.sourceTokenAccount, selected.toBase58());

  f.accounts.set(selected.toBase58(), tokenAccountInfo(f.mint, keys(), 1234567n));
  await assert.rejects(
    client.buildDepositTransaction({ provider: f.provider, nexusAccount: 'acct', inputUnits: '5', walletPublicKey: f.wallet, sourceTokenAccount: selected }),
    /owner/i,
  );
});

test('loadPair proves mint, vault, owner, decimals, cluster and classifies owner ATA', async () => {
  const f = fixture({ auxiliary: false });
  const pair = await createSolanaClient({ rpcUrl: 'https://rpc.example.test', connection: f.connection }).loadPair(f.provider);
  assert.equal(pair.verifiedVault, 'ownerATA');
  assert.equal(pair.solanaVault, f.vault.toBase58());
  assert.equal(pair.solanaGenesis, 'genesis-test');
});

test('loadPair derives unpublished decimals and vault owner and rejects conflicting enrichment', async () => {
  const f = fixture({ auxiliary: true });
  const provider = { ...f.provider };
  delete provider.solanaDecimals;
  delete provider.solanaVaultOwner;
  const pair = await clientFor(f).loadPair(provider);
  assert.equal(pair.solanaDecimals, 6);
  assert.equal(pair.solanaVaultOwner, f.vaultOwner.toBase58());
  assert.equal(pair.verifiedVault, 'auxiliary');
  await assert.rejects(clientFor(f).loadPair({ ...provider, solanaDecimals: 5 }), /decimals/i);
  await assert.rejects(clientFor(f).loadPair({ ...provider, solanaVaultOwner: keys().toBase58() }), /owner/i);
});

test('verifyDeposit requires finalized exact transfer, signer authority and exact configured memo', async () => {
  const f = fixture();
  const tx = parsedTransaction({ mint: f.mint, source: f.source, destination: f.vault, authority: f.wallet, amount: 500n, memo: 'nexus:alice', destinationOwner: f.vaultOwner });
  f.connection.getSignatureStatuses = async () => ({ value: [{ err: null, confirmationStatus: 'finalized' }] });
  f.connection.getParsedTransaction = async () => tx;
  const job = { direction: 'solana-to-nexus', provider: f.provider, quote: { inputUnits: '500' }, nexusAccount: 'alice' };
  const evidence = await createSolanaClient({ rpcUrl: 'https://rpc.example.test', connection: f.connection }).verifyDeposit('signature', job);
  assert.deepEqual(evidence, {
    signature: 'signature',
    sourceContract: f.source.toBase58(),
    sourceTokenAccount: f.source.toBase58(),
    destinationTokenAccount: f.vault.toBase58(),
    mint: f.mint.toBase58(),
    authority: f.wallet.toBase58(),
    units: '500',
    memo: 'nexus:alice',
    slot: 77,
    blockTime: 1788739200,
  });

  tx.transaction.message.instructions[1].parsed = 'prefix nexus:alice suffix';
  await assert.rejects(() => createSolanaClient({ rpcUrl: 'https://rpc.example.test', connection: f.connection }).verifyDeposit('signature', job), /memo/i);
});

test('verifyDeposit rejects failed, non-finalized, owner-aggregate and balance-only evidence', async () => {
  const f = fixture();
  const tx = parsedTransaction({ mint: f.mint, source: f.source, destination: f.vault, authority: f.wallet, amount: 500n, memo: 'nexus:alice', destinationOwner: f.vaultOwner });
  f.connection.getParsedTransaction = async () => tx;
  f.connection.getSignatureStatuses = async () => ({ value: [{ err: null, confirmationStatus: 'confirmed' }] });
  const client = createSolanaClient({ rpcUrl: 'https://rpc.example.test', connection: f.connection });
  const job = { direction: 'solana-to-nexus', provider: f.provider, quote: { inputUnits: '500' }, nexusAccount: 'alice' };
  await assert.rejects(client.verifyDeposit('signature', job), /finalized/i);

  f.connection.getSignatureStatuses = async () => ({ value: [{ err: null, confirmationStatus: 'finalized' }] });
  tx.transaction.message.instructions = tx.transaction.message.instructions.slice(1);
  await assert.rejects(client.verifyDeposit('signature', job), /transferChecked/i);
});

test('verification rejects evidence queried from a cluster other than the frozen provider genesis', async () => {
  const f = fixture();
  const tx = parsedTransaction({ mint: f.mint, source: f.source, destination: f.vault, authority: f.wallet, amount: 500n, memo: 'nexus:alice', destinationOwner: f.vaultOwner });
  f.connection.getGenesisHash = async () => 'wrong-cluster';
  f.connection.getSignatureStatuses = async () => ({ value: [{ err: null, confirmationStatus: 'finalized' }] });
  f.connection.getParsedTransaction = async () => tx;
  const job = { direction: 'solana-to-nexus', provider: f.provider, quote: { inputUnits: '500' }, nexusAccount: 'alice' };
  await assert.rejects(clientFor(f).verifyDeposit('signature', job), /cluster|genesis/i);
});

test('verification rejects transferChecked-shaped evidence from any non-classic token program', async () => {
  const f = fixture();
  const tx = parsedTransaction({ mint: f.mint, source: f.source, destination: f.vault, authority: f.wallet, amount: 500n, memo: 'nexus:alice', destinationOwner: f.vaultOwner });
  tx.transaction.message.instructions[0].programId = keys();
  f.connection.getSignatureStatuses = async () => ({ value: [{ err: null, confirmationStatus: 'finalized' }] });
  f.connection.getParsedTransaction = async () => tx;
  const job = { direction: 'solana-to-nexus', provider: f.provider, quote: { inputUnits: '500' }, nexusAccount: 'alice' };
  await assert.rejects(clientFor(f).verifyDeposit('signature', job), /transferChecked/i);
});

test('verifyPayout proves exact vault, actual destination token account, units and composite memo', async () => {
  const f = fixture();
  const destinationOwner = keys();
  const destination = keys();
  const tx = parsedTransaction({ mint: f.mint, source: f.vault, destination, authority: f.vaultOwner, amount: 450n, memo: 'nexus_txid:abc123:7', destinationOwner });
  f.connection.getSignatureStatuses = async () => ({ value: [{ err: null, confirmationStatus: 'finalized' }] });
  f.connection.getParsedTransaction = async () => tx;
  const job = {
    direction: 'nexus-to-solana',
    provider: f.provider,
    quote: { outputUnits: '450' },
    solanaAccount: destination.toBase58(),
    sourceTxid: 'abc123',
    sourceContract: '7',
  };
  const evidence = await createSolanaClient({ rpcUrl: 'https://rpc.example.test', connection: f.connection }).verifyPayout('payout-signature', job);
  assert.equal(evidence.signature, 'payout-signature');
  assert.equal(evidence.sourceTxid, 'abc123');
  assert.equal(evidence.sourceContract, '7');
  assert.equal(evidence.sourceTokenAccount, f.vault.toBase58());
  assert.equal(evidence.destinationTokenAccount, destination.toBase58());
  assert.equal(evidence.units, '450');

  tx.transaction.message.instructions[1].parsed = 'nexus_txid:abc123:70';
  await assert.rejects(clientFor(f).verifyPayout('payout-signature', job), /memo/i);
});

function clientFor(f) {
  return createSolanaClient({ rpcUrl: 'https://rpc.example.test', connection: f.connection });
}

test('injected wallet detection accepts only explicit Phantom or Solflare providers', () => {
  const phantom = { isPhantom: true };
  const solflare = { isSolflare: true };
  assert.deepEqual(detectInjectedWallet({ phantom: { solana: phantom } }), { name: 'Phantom', provider: phantom });
  assert.deepEqual(detectInjectedWallet({ solflare }), { name: 'Solflare', provider: solflare });
  assert.equal(detectInjectedWallet({ solana: { connect() {} } }), null);
});

test('wallet submission never retries ambiguous broadcasts and supports signTransaction fallback', async () => {
  const f = fixture();
  const tx = { feePayer: f.wallet, serialize: () => Buffer.from('signed') };
  let sends = 0;
  const wallet = { publicKey: f.wallet, isConnected: true, signTransaction: async () => tx };
  const connection = { sendRawTransaction: async (raw, options) => { sends += 1; assert.equal(raw.toString(), 'signed'); assert.equal(options.maxRetries, 0); throw new Error('timeout'); } };
  const result = await signAndSendTransaction({ wallet, transaction: tx, connection });
  assert.equal(result.status, 'outcome_unknown');
  assert.equal(sends, 1);
});

test('Solana Pay URI helper fails closed outside the explicitly reviewed mainnet genesis', () => {
  const f = fixture({ auxiliary: false });
  const job = { provider: { ...f.provider, verifiedVault: 'ownerATA' }, quote: { inputAmount: '1.234567' }, nexusAccount: 'alice' };
  assert.equal(makeSolanaPayUrl(job), null);
  assert.equal(makeSolanaPayUrl({ ...job, provider: { ...job.provider, solanaGenesis: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG' } }), null);
  assert.equal(makeSolanaPayUrl({ ...job, provider: { ...job.provider, solanaGenesis: 'unknown-cluster' } }), null);
});

test('Solana Pay URI helper retains a pure reviewed-mainnet owner-ATA capability', () => {
  const f = fixture({ auxiliary: false });
  const job = {
    provider: {
      ...f.provider,
      solanaGenesis: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
      verifiedVault: 'ownerATA',
    },
    quote: { inputAmount: '1.234567' },
    nexusAccount: 'alice',
  };
  const url = makeSolanaPayUrl(job);
  assert.match(url, new RegExp(`^solana:${f.vaultOwner.toBase58()}\\?`));
  const params = new URL(url).searchParams;
  assert.equal(params.get('amount'), '1.234567');
  assert.equal(params.get('spl-token'), f.mint.toBase58());
  assert.equal(params.get('memo'), 'nexus:alice');
  assert.equal(makeSolanaPayUrl({ ...job, provider: { ...job.provider, verifiedVault: 'auxiliary' } }), null);
});

test('companion accepts only a strict expiring public job and secure/local endpoints', () => {
  const f = fixture();
  const publicJob = {
    id: 'job-1',
    reference: 'public-reference',
    scope: { genesis: 'wallet-genesis', nexusNetwork: 'LLL-TAO-test', solanaGenesis: 'genesis-test' },
    direction: 'solana-to-nexus',
    nexusAccount: 'alice',
    expiresAt: Date.now() + 60000,
    provider: { ...f.provider, receiptSchema: 'nexus-swap-receipt-v1' },
    quote: { inputUnits: '500', outputUnits: '490', feeUnits: '10', inputAmount: '0.0005', outputAmount: '0.00049' },
  };
  const encoded = Buffer.from(JSON.stringify(publicJob)).toString('base64url');
  assert.equal(parsePublicJob(`#job=${encoded}`, { now: Date.now() }).id, 'job-1');
  assert.throws(() => parsePublicJob(`#job=${Buffer.from(JSON.stringify({ ...publicJob, transaction: 'base64bytes' })).toString('base64url')}`), /field|transaction/i);
  assert.throws(() => parsePublicJob(`#job=${Buffer.from(JSON.stringify({ ...publicJob, expiresAt: Date.now() - 1 })).toString('base64url')}`), /expired/i);
  assert.throws(() => parsePublicJob(`#job=${Buffer.from(JSON.stringify({ ...publicJob, quote: { ...publicJob.quote, inputAmount: '0.000501' } })).toString('base64url')}`), /inputAmount|inputUnits/i);
  assert.throws(() => parsePublicJob(`#job=${Buffer.from(JSON.stringify({ ...publicJob, quote: { ...publicJob.quote, outputAmount: '0.000491' } })).toString('base64url')}`), /outputAmount|outputUnits/i);
  assert.equal(validateEndpoint('https://rpc.example.test').protocol, 'https:');
  assert.equal(validateEndpoint('http://localhost:8899').hostname, 'localhost');
  assert.throws(() => validateEndpoint('http://rpc.example.test'), /HTTPS|localhost/i);
  assert.throws(() => validateEndpoint('https://user:pass@rpc.example.test'), /credentials/i);
});

test('companion resolves RPC only from reviewed network policy and enforces deployment acceptance', () => {
  const f = fixture();
  const job = {
    id: 'job-policy',
    direction: 'solana-to-nexus',
    scope: { genesis: 'wallet', nexusNetwork: f.provider.nexusNetwork, solanaGenesis: f.provider.solanaGenesis },
    provider: { ...f.provider, receiptSchema: 'nexus-swap-receipt-v1' },
    quote: { outputUnits: '490' },
  };
  const accepted = [{
    address: f.provider.address,
    owner: f.provider.owner,
    nexusToken: f.provider.nexusToken,
    nexusTreasury: f.provider.nexusTreasury,
    solanaMint: f.provider.solanaMint,
    solanaVault: f.provider.solanaVault,
    nexusNetwork: f.provider.nexusNetwork,
    solanaGenesis: f.provider.solanaGenesis,
    directions: ['solana-to-nexus'],
    dustToNexusUnits: '1',
    evidence: 'acceptance/report.md',
  }];
  const resolved = resolveDeployment(job, { test: { genesis: f.provider.solanaGenesis, rpcUrl: 'https://rpc.reviewed.test' } }, accepted);
  assert.equal(resolved.rpcUrl, 'https://rpc.reviewed.test/');
  assert.throws(() => resolveDeployment({ ...job, provider: { ...job.provider, receiptSchema: undefined } }, { test: { genesis: f.provider.solanaGenesis, rpcUrl: 'https://rpc.reviewed.test' } }, accepted), /receipt/i);
  assert.throws(() => resolveDeployment(job, { test: { genesis: f.provider.solanaGenesis, rpcUrl: 'https://rpc.reviewed.test' } }, []), /Funding disabled/i);
  assert.throws(() => resolveDeployment(job, { other: { genesis: 'other', rpcUrl: 'https://other.test' } }, accepted), /cluster|RPC/i);
});

test('packaged companion is vanilla DOM markup with the external signer bundle and safety terms', () => {
  const html = fs.readFileSync(path.join(__dirname, '../../dist/solana-sign.html'), 'utf8');
  assert.match(html, /<script[^>]+src="js\/solana-signer\.js"[^>]*><\/script>/);
  assert.doesNotMatch(html, /<script(?![^>]+src=)[^>]*>/);
  for (const id of ['custody', 'cluster', 'mint', 'vault', 'vault-owner', 'memo', 'source-account', 'approve-transfer', 'signature', 'copy-signature']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});
