'use strict';

const { Buffer } = require('buffer');
const {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} = require('@solana/web3.js');
const {
  TOKEN_PROGRAM_ID,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  unpackAccount,
  unpackMint,
} = require('@solana/spl-token');

const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
const MAX_MEMO_BYTES = 566;
const COMMITMENT = 'finalized';
const MAINNET_GENESIS = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

function publicKey(value, label) {
  try {
    return value instanceof PublicKey ? value : new PublicKey(value);
  } catch (_) {
    throw new TypeError(`${label} is not a valid Solana public key`);
  }
}

function positiveUnits(value, label) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value)) {
    throw new TypeError(`${label} must be a positive integer base-unit string`);
  }
  return BigInt(value);
}

function validateProvider(provider) {
  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    throw new TypeError('provider is required');
  }
  const requiredStrings = [
    'solanaMint', 'solanaVault', 'solanaGenesis',
    'memoPrefix', 'solanaSymbol', 'nexusSymbol', 'nexusNetwork',
  ];
  for (const name of requiredStrings) {
    if (typeof provider[name] !== 'string' || provider[name].length === 0) {
      throw new TypeError(`provider.${name} is required`);
    }
  }
  if (provider.solanaDecimals !== undefined && (!Number.isInteger(provider.solanaDecimals) || provider.solanaDecimals < 0 || provider.solanaDecimals > 255)) {
    throw new TypeError('provider.solanaDecimals must be an integer between 0 and 255 when supplied');
  }
  publicKey(provider.solanaMint, 'provider.solanaMint');
  publicKey(provider.solanaVault, 'provider.solanaVault');
  if (provider.solanaVaultOwner !== undefined) publicKey(provider.solanaVaultOwner, 'provider.solanaVaultOwner');
  return provider;
}

function requireEnrichedProvider(provider) {
  validateProvider(provider);
  if (!Number.isInteger(provider.solanaDecimals)) throw new TypeError('provider.solanaDecimals chain enrichment is required');
  if (typeof provider.solanaVaultOwner !== 'string' || !provider.solanaVaultOwner) throw new TypeError('provider.solanaVaultOwner chain enrichment is required');
  publicKey(provider.solanaVaultOwner, 'provider.solanaVaultOwner');
  return provider;
}

function validateRpcUrl(value) {
  let url;
  try { url = new URL(value); } catch (_) { throw new TypeError('rpcUrl must be an absolute URL'); }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === '[::1]';
  if (url.username || url.password) throw new TypeError('rpcUrl must not contain credentials');
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new TypeError('rpcUrl must use HTTPS (HTTP is allowed only for localhost)');
  }
  return url.toString();
}

function accountKeyEntry(entry) {
  if (entry && typeof entry === 'object' && 'pubkey' in entry) {
    return { address: publicKey(entry.pubkey, 'transaction account').toBase58(), signer: entry.signer === true };
  }
  return { address: publicKey(entry, 'transaction account').toBase58(), signer: false };
}

function allInstructions(tx) {
  const top = tx.transaction.message.instructions || [];
  const inner = (tx.meta.innerInstructions || []).flatMap((group) => group.instructions || []);
  return top.concat(inner);
}

function parsedTransferChecked(instruction) {
  if (!instruction || !instruction.parsed || instruction.parsed.type !== 'transferChecked') return null;
  try {
    if (!instruction.programId || !publicKey(instruction.programId, 'token program').equals(TOKEN_PROGRAM_ID)) return null;
  } catch (_) { return null; }
  const info = instruction.parsed.info || {};
  const tokenAmount = info.tokenAmount || {};
  if (!info.source || !info.destination || !info.mint || !info.authority || typeof tokenAmount.amount !== 'string') return null;
  return {
    source: info.source,
    destination: info.destination,
    mint: info.mint,
    authority: info.authority,
    units: tokenAmount.amount,
    decimals: tokenAmount.decimals,
  };
}

function parsedMemo(instruction) {
  if (!instruction || !instruction.programId) return null;
  let isMemo = false;
  try { isMemo = publicKey(instruction.programId, 'memo program').equals(MEMO_PROGRAM_ID); } catch (_) { return null; }
  if (!isMemo) return null;
  if (typeof instruction.parsed === 'string') return instruction.parsed;
  if (instruction.parsed && typeof instruction.parsed.memo === 'string') return instruction.parsed.memo;
  return null;
}

function assertSourceAuthority(tx, transfer) {
  const keys = (tx.transaction.message.accountKeys || []).map(accountKeyEntry);
  const authority = keys.find((entry) => entry.address === transfer.authority);
  if (!authority || !authority.signer) throw new Error('transferChecked authority is not a transaction signer');
  const sourceIndex = keys.findIndex((entry) => entry.address === transfer.source);
  const sourceBalance = (tx.meta.preTokenBalances || []).find((entry) => entry.accountIndex === sourceIndex);
  if (!sourceBalance || sourceBalance.mint !== transfer.mint || sourceBalance.owner !== transfer.authority) {
    throw new Error('source token account authority is not proven by transaction evidence');
  }
}

function exactEvidence(tx, expected) {
  if (!tx || !tx.transaction || !tx.meta) throw new Error('transaction evidence is unavailable');
  if (tx.meta.err !== null) throw new Error('transaction was not successful');
  const instructions = allInstructions(tx);
  const memos = instructions.map(parsedMemo).filter((memo) => memo !== null);
  if (memos.length !== 1 || memos[0] !== expected.memo) throw new Error('transaction memo does not exactly match expected memo');
  const transfers = instructions.map(parsedTransferChecked).filter(Boolean);
  const matches = transfers.filter((transfer) => (
    transfer.source === expected.source
    && transfer.destination === expected.destination
    && transfer.mint === expected.mint
    && transfer.units === expected.units
    && transfer.decimals === expected.decimals
    && (!expected.authority || transfer.authority === expected.authority)
  ));
  if (matches.length !== 1) throw new Error('exactly one matching transferChecked instruction was not proven');
  assertSourceAuthority(tx, matches[0]);
  return matches[0];
}

function createSolanaClient({ rpcUrl, connection } = {}) {
  if (!connection && !rpcUrl) throw new TypeError('rpcUrl or connection is required');
  const normalizedRpcUrl = rpcUrl ? validateRpcUrl(rpcUrl) : null;
  const rpc = connection || new Connection(normalizedRpcUrl, COMMITMENT);

  async function assertCluster(provider) {
    const genesis = await rpc.getGenesisHash();
    if (genesis !== provider.solanaGenesis) throw new Error('Solana cluster genesis does not match provider');
    return genesis;
  }

  async function validateTokenAccount(address, mint, expectedOwner) {
    const addressKey = publicKey(address, 'token account address');
    const mintKey = publicKey(mint, 'mint');
    const info = await rpc.getAccountInfo(addressKey, { commitment: COMMITMENT });
    if (!info) throw new Error(`token account ${addressKey.toBase58()} does not exist`);
    let account;
    try { account = unpackAccount(addressKey, info, TOKEN_PROGRAM_ID); } catch (error) {
      throw new Error(`invalid classic SPL token account ${addressKey.toBase58()}: ${error.message}`);
    }
    if (!account.mint.equals(mintKey)) throw new Error('token account mint does not match expected mint');
    if (expectedOwner && !account.owner.equals(publicKey(expectedOwner, 'expected owner'))) {
      throw new Error('token account owner does not match expected owner');
    }
    return Object.freeze({
      address: addressKey.toBase58(),
      mint: account.mint.toBase58(),
      owner: account.owner.toBase58(),
      units: account.amount.toString(),
      isFrozen: account.isFrozen,
      isInitialized: account.isInitialized,
    });
  }

  async function loadPair(provider) {
    validateProvider(provider);
    await assertCluster(provider);
    const mintKey = publicKey(provider.solanaMint, 'provider.solanaMint');
    const mintInfo = await rpc.getAccountInfo(mintKey, { commitment: COMMITMENT });
    if (!mintInfo) throw new Error('provider mint does not exist');
    let mint;
    try { mint = unpackMint(mintKey, mintInfo, TOKEN_PROGRAM_ID); } catch (error) {
      throw new Error(`invalid classic SPL mint: ${error.message}`);
    }
    if (provider.solanaDecimals !== undefined && mint.decimals !== provider.solanaDecimals) throw new Error('provider mint decimals do not match on-chain mint');
    const vault = await validateTokenAccount(provider.solanaVault, provider.solanaMint);
    if (provider.solanaVaultOwner !== undefined && vault.owner !== publicKey(provider.solanaVaultOwner, 'provider.solanaVaultOwner').toBase58()) {
      throw new Error('provider vault owner does not match on-chain token account owner');
    }
    if (vault.isFrozen || !vault.isInitialized) throw new Error('provider vault is not an active token account');
    const ownerAta = getAssociatedTokenAddressSync(mintKey, publicKey(vault.owner, 'on-chain vault owner'));
    return Object.freeze({
      ...provider,
      solanaMint: mintKey.toBase58(),
      solanaVault: vault.address,
      solanaDecimals: mint.decimals,
      solanaVaultOwner: vault.owner,
      verifiedVault: ownerAta.equals(publicKey(vault.address, 'provider.solanaVault')) ? 'ownerATA' : 'auxiliary',
    });
  }

  async function findSourceTokenAccounts(owner, mint, minUnits = '1') {
    const ownerKey = publicKey(owner, 'wallet owner');
    const mintKey = publicKey(mint, 'mint');
    const minimum = positiveUnits(minUnits, 'minUnits');
    const response = await rpc.getTokenAccountsByOwner(ownerKey, { mint: mintKey }, { commitment: COMMITMENT });
    const ata = getAssociatedTokenAddressSync(mintKey, ownerKey).toBase58();
    return (response.value || []).map(({ pubkey, account: info }) => {
      const account = unpackAccount(pubkey, info, TOKEN_PROGRAM_ID);
      return { address: pubkey.toBase58(), units: account.amount.toString(), isAssociated: pubkey.toBase58() === ata, owner: account.owner.toBase58(), mint: account.mint.toBase58() };
    }).filter((account) => account.owner === ownerKey.toBase58() && account.mint === mintKey.toBase58() && BigInt(account.units) >= minimum)
      .sort((a, b) => Number(b.isAssociated) - Number(a.isAssociated));
  }

  async function buildDepositTransaction({ provider, nexusAccount, inputUnits, walletPublicKey, sourceTokenAccount } = {}) {
    const pair = await loadPair(provider);
    if (typeof nexusAccount !== 'string' || nexusAccount.length === 0 || Array.from(nexusAccount).some((character) => character.codePointAt(0) < 32)) {
      throw new TypeError('nexusAccount is required and must not contain control characters');
    }
    const amount = positiveUnits(inputUnits, 'inputUnits');
    const wallet = publicKey(walletPublicKey, 'walletPublicKey');
    const mint = publicKey(pair.solanaMint, 'provider.solanaMint');
    const source = sourceTokenAccount
      ? publicKey(sourceTokenAccount, 'sourceTokenAccount')
      : getAssociatedTokenAddressSync(mint, wallet);
    const sourceProof = await validateTokenAccount(source, mint, wallet);
    if (sourceProof.isFrozen || !sourceProof.isInitialized) throw new Error('source token account is not active');
    if (BigInt(sourceProof.units) < amount) throw new Error('source token account has insufficient token units');
    const memo = `${pair.memoPrefix}${nexusAccount}`;
    if (Buffer.byteLength(memo, 'utf8') > MAX_MEMO_BYTES) throw new Error('memo is too long');
    const latest = await rpc.getLatestBlockhash({ commitment: COMMITMENT });
    const transaction = new Transaction({
      feePayer: wallet,
      blockhash: latest.blockhash,
      lastValidBlockHeight: latest.lastValidBlockHeight,
    });
    transaction.add(createTransferCheckedInstruction(
      source,
      mint,
      publicKey(pair.solanaVault, 'provider.solanaVault'),
      wallet,
      amount,
      pair.solanaDecimals,
      [],
      TOKEN_PROGRAM_ID,
    ));
    transaction.add(new TransactionInstruction({
      programId: MEMO_PROGRAM_ID,
      keys: [],
      data: Buffer.from(memo, 'utf8'),
    }));
    return Object.freeze({
      transaction,
      sourceTokenAccount: source.toBase58(),
      destinationTokenAccount: pair.solanaVault,
      mint: pair.solanaMint,
      units: amount.toString(),
      memo,
      verifiedVault: pair.verifiedVault,
    });
  }

  async function finalizedTransaction(signature) {
    if (typeof signature !== 'string' || signature.length === 0) throw new TypeError('signature is required');
    const statuses = await rpc.getSignatureStatuses([signature], { searchTransactionHistory: true });
    const status = statuses && statuses.value && statuses.value[0];
    if (!status || status.err !== null || status.confirmationStatus !== 'finalized') {
      throw new Error('signature is not a successful finalized transaction');
    }
    const tx = await rpc.getParsedTransaction(signature, { commitment: COMMITMENT, maxSupportedTransactionVersion: 0 });
    if (!tx) throw new Error('finalized transaction evidence is unavailable');
    if (tx.meta && tx.meta.err !== null) throw new Error('transaction was not successful');
    return tx;
  }

  async function verifyDeposit(signature, job) {
    if (!job || job.direction !== 'solana-to-nexus') throw new TypeError('a solana-to-nexus job is required');
    const provider = requireEnrichedProvider(job.provider);
    const units = positiveUnits(job.quote && job.quote.inputUnits, 'job.quote.inputUnits').toString();
    if (typeof job.nexusAccount !== 'string' || job.nexusAccount.length === 0) throw new TypeError('job.nexusAccount is required');
    await assertCluster(provider);
    const tx = await finalizedTransaction(signature);
    const expected = {
      source: null,
      destination: publicKey(provider.solanaVault, 'provider.solanaVault').toBase58(),
      mint: publicKey(provider.solanaMint, 'provider.solanaMint').toBase58(),
      units,
      decimals: provider.solanaDecimals,
      memo: `${provider.memoPrefix}${job.nexusAccount}`,
    };
    const instructions = allInstructions(tx);
    const candidateTransfers = instructions.map(parsedTransferChecked).filter((transfer) => transfer
      && transfer.destination === expected.destination
      && transfer.mint === expected.mint
      && transfer.units === expected.units
      && transfer.decimals === expected.decimals);
    if (candidateTransfers.length !== 1) throw new Error('exactly one candidate transferChecked deposit was not proven');
    expected.source = candidateTransfers[0].source;
    const transfer = exactEvidence(tx, expected);
    return Object.freeze({
      signature,
      sourceContract: transfer.source,
      sourceTokenAccount: transfer.source,
      destinationTokenAccount: transfer.destination,
      mint: transfer.mint,
      authority: transfer.authority,
      units: transfer.units,
      memo: expected.memo,
      slot: tx.slot,
      blockTime: tx.blockTime,
    });
  }

  async function verifyPayout(signature, job) {
    if (!job || job.direction !== 'nexus-to-solana') throw new TypeError('a nexus-to-solana job is required');
    const provider = requireEnrichedProvider(job.provider);
    const units = positiveUnits(job.quote && job.quote.outputUnits, 'job.quote.outputUnits').toString();
    if (typeof job.sourceTxid !== 'string' || !job.sourceTxid || typeof job.sourceContract !== 'string' || !job.sourceContract) {
      throw new TypeError('job sourceTxid and sourceContract are required');
    }
    const memo = `nexus_txid:${job.sourceTxid}:${job.sourceContract}`;
    await assertCluster(provider);
    const tx = await finalizedTransaction(signature);
    const transfer = exactEvidence(tx, {
      source: publicKey(provider.solanaVault, 'provider.solanaVault').toBase58(),
      destination: publicKey(job.solanaAccount, 'job.solanaAccount').toBase58(),
      mint: publicKey(provider.solanaMint, 'provider.solanaMint').toBase58(),
      authority: publicKey(provider.solanaVaultOwner, 'provider.solanaVaultOwner').toBase58(),
      units,
      decimals: provider.solanaDecimals,
      memo,
    });
    return Object.freeze({
      signature,
      sourceTxid: job.sourceTxid,
      sourceContract: job.sourceContract,
      sourceTokenAccount: transfer.source,
      destinationTokenAccount: transfer.destination,
      mint: transfer.mint,
      authority: transfer.authority,
      units: transfer.units,
      memo,
      slot: tx.slot,
      blockTime: tx.blockTime,
    });
  }

  return Object.freeze({
    rpcUrl: normalizedRpcUrl,
    connection: rpc,
    loadPair,
    validateTokenAccount,
    findSourceTokenAccounts,
    buildDepositTransaction,
    verifyDeposit,
    verifyPayout,
  });
}

function detectInjectedWallet(windowObject = (typeof window !== 'undefined' ? window : undefined), preferred) {
  if (!windowObject) return null;
  const phantom = (windowObject.phantom && windowObject.phantom.solana) || windowObject.solana;
  const solflare = windowObject.solflare;
  const choices = {
    Phantom: phantom && phantom.isPhantom === true ? { name: 'Phantom', provider: phantom } : null,
    Solflare: solflare && solflare.isSolflare === true ? { name: 'Solflare', provider: solflare } : null,
  };
  if (preferred) return choices[preferred] || null;
  return choices.Phantom || choices.Solflare || null;
}

async function connectInjectedWallet(wallet) {
  if (!wallet || !wallet.provider || typeof wallet.provider.connect !== 'function') throw new Error('supported injected wallet is unavailable');
  const result = await wallet.provider.connect();
  const publicKeyValue = (result && result.publicKey) || wallet.provider.publicKey;
  if (!publicKeyValue) throw new Error('wallet did not return a public key');
  return { name: wallet.name, provider: wallet.provider, publicKey: publicKey(publicKeyValue, 'wallet public key') };
}

async function signAndSendTransaction({ wallet, transaction, connection } = {}) {
  if (!wallet || !wallet.publicKey || wallet.isConnected === false) throw new Error('wallet must be connected by the user');
  if (!transaction || !connection) throw new TypeError('transaction and connection are required');
  const walletKey = publicKey(wallet.publicKey, 'wallet public key');
  if (!transaction.feePayer || !publicKey(transaction.feePayer, 'transaction fee payer').equals(walletKey)) {
    throw new Error('connected wallet does not match transaction fee payer');
  }
  try {
    if (typeof wallet.signAndSendTransaction === 'function') {
      const response = await wallet.signAndSendTransaction(transaction);
      const signature = typeof response === 'string' ? response : response && response.signature;
      if (!signature) return { status: 'outcome_unknown', signature: null, reason: 'wallet returned no signature' };
      return { status: 'submitted', signature };
    }
    if (typeof wallet.signTransaction !== 'function') throw new Error('wallet does not support transaction signing');
    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false, maxRetries: 0 });
    return { status: 'submitted', signature };
  } catch (error) {
    return { status: 'outcome_unknown', signature: null, reason: error && error.message ? error.message : 'wallet submission outcome is unknown' };
  }
}

function makeSolanaPayUrl(job) {
  if (!job || !job.provider || job.provider.verifiedVault !== 'ownerATA') return null;
  const provider = requireEnrichedProvider(job.provider);
  if (provider.solanaGenesis !== MAINNET_GENESIS) return null;
  if (!job.quote || typeof job.quote.inputAmount !== 'string' || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(job.quote.inputAmount)) return null;
  if (typeof job.nexusAccount !== 'string' || !job.nexusAccount) return null;
  const expectedAta = getAssociatedTokenAddressSync(publicKey(provider.solanaMint, 'provider.solanaMint'), publicKey(provider.solanaVaultOwner, 'provider.solanaVaultOwner'));
  if (!expectedAta.equals(publicKey(provider.solanaVault, 'provider.solanaVault'))) return null;
  const params = new URLSearchParams({
    amount: job.quote.inputAmount,
    'spl-token': provider.solanaMint,
    memo: `${provider.memoPrefix}${job.nexusAccount}`,
  });
  return `solana:${provider.solanaVaultOwner}?${params.toString()}`;
}

module.exports = {
  MEMO_PROGRAM_ID,
  createSolanaClient,
  detectInjectedWallet,
  connectInjectedWallet,
  signAndSendTransaction,
  makeSolanaPayUrl,
};
