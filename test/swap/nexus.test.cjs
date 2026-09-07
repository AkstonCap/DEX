'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');

const { createNexusClient } = require('../../src/swap/nexus.js');

function rpcFixture(routes) {
  const calls = [];
  const call = async (endpoint, params = {}) => {
    calls.push({ endpoint, params });
    if (!(endpoint in routes)) throw new Error(`unexpected endpoint ${endpoint}`);
    const value = routes[endpoint];
    return typeof value === 'function' ? value(params, calls) : value;
  };
  return { call, calls };
}

test('loadContext returns the logged-in genesis and deterministic Nexus network', async () => {
  const rpc = rpcFixture({
    'profiles/status/master': { result: { genesis: 'user-genesis', confirmed: true } },
    'system/get/info': { testnet: 3, private: false, synchronized: true },
  });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => assert.fail('write') });

  assert.deepEqual(await client.loadContext(), {
    genesis: 'user-genesis',
    nexusNetwork: 'testnet:3',
  });
  assert.deepEqual(rpc.calls.map(({ endpoint }) => endpoint).sort(), [
    'profiles/status/master',
    'system/get/info',
  ]);
});

test('loadPair authenticates the token by register address and decimals', async () => {
  const provider = {
    name: 'provider-a', nexusToken: 'token-register', nexusTreasury: 'treasury',
    nexusSymbol: 'USDD', nexusDecimals: 6, solanaMint: 'mint', solanaVault: 'vault',
    solanaSymbol: 'USDC', solanaDecimals: 6, memoPrefix: 'nexus:',
  };
  const rpc = rpcFixture({
    'register/get/finance:token': {
      address: 'token-register', token: 'token-register', decimals: 6, ticker: 'USDD',
    },
  });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => assert.fail('write') });

  assert.deepEqual(await client.loadPair(provider), provider);
  assert.deepEqual(rpc.calls, [{
    endpoint: 'register/get/finance:token', params: { address: 'token-register' },
  }]);
});

test('loadPair rejects a conflicting token register instead of trusting its ticker', async () => {
  const rpc = rpcFixture({
    'register/get/finance:token': { address: 'other-token', decimals: 6, ticker: 'USDD' },
  });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });
  await assert.rejects(
    client.loadPair({ nexusToken: 'token-register', nexusDecimals: 6, nexusSymbol: 'USDD' }),
    /token register identity mismatch/,
  );
});

test('listAccounts returns only query-proven accounts for the exact owner and token', async () => {
  const accounts = [{
    address: 'user-token-account', owner: 'user-genesis', token: 'token-register',
    ticker: 'USDD', balance: '12.5', decimals: 6,
  }];
  const rpc = rpcFixture({ 'register/list/finance:account': { result: accounts } });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });

  assert.deepEqual(
    await client.listAccounts({ nexusToken: 'token-register' }, 'user-genesis'),
    accounts,
  );
  assert.deepEqual(rpc.calls, [{
    endpoint: 'register/list/finance:account',
    params: {
      where: 'results.owner=user-genesis AND results.token=token-register',
      limit: 100,
    },
  }]);
});

test('listAccounts rejects a lossy or ignored server filter', async () => {
  const rpc = rpcFixture({
    'register/list/finance:account': [{
      address: 'foreign', owner: 'other-genesis', token: 'token-register',
    }],
  });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });
  await assert.rejects(
    client.listAccounts({ nexusToken: 'token-register' }, 'user-genesis'),
    /query mismatch/,
  );
});

test('submitDebit sends exact immutable Nexus-source terms only through secureApiCall', async () => {
  const writes = [];
  const client = createNexusClient({
    apiCall: async () => assert.fail('read'),
    secureApiCall: async (endpoint, params) => {
      writes.push({ endpoint, params });
      return { result: { success: true, txid: 'user-debit-txid' } };
    },
  });
  const job = {
    direction: 'nexus-to-solana', reference: '18446744073709551615',
    nexusAccount: 'user-token-account',
    provider: { nexusTreasury: 'provider-treasury', nexusToken: 'token-register', nexusDecimals: 6 },
    quote: { inputAmount: '12.500001', outputAmount: '12.4' },
  };

  assert.deepEqual(await client.submitDebit(job), { txid: 'user-debit-txid' });
  assert.deepEqual(writes, [{
    endpoint: 'finance/debit/account',
    params: {
      from: 'user-token-account', to: 'provider-treasury',
      amount: '12.500001', reference: '18446744073709551615',
    },
  }]);
  assert.equal('pin' in writes[0].params, false);
});

test('submitDebit rejects non-string money and out-of-range references before writing', async () => {
  let writes = 0;
  const client = createNexusClient({ apiCall: async () => {}, secureApiCall: async () => { writes += 1; } });
  const base = {
    direction: 'nexus-to-solana', reference: '7', nexusAccount: 'source',
    provider: { nexusTreasury: 'treasury', nexusToken: 'token', nexusDecimals: 6 },
    quote: { inputAmount: '1.0' },
  };
  await assert.rejects(client.submitDebit({ ...base, quote: { inputAmount: 1 } }), /decimal string/);
  await assert.rejects(client.submitDebit({ ...base, reference: '18446744073709551616' }), /uint64/);
  assert.equal(writes, 0);
});

function nexusJob(overrides = {}) {
  return {
    id: 'job-1', direction: 'nexus-to-solana', scope: {genesis: 'user-genesis', nexusNetwork: 'testnet:3', solanaGenesis: 'solana-genesis'},
    nexusMinConfirmations: 2, reference: '9', nexusAccount: 'user-token-account',
    solanaAccount: 'solana-token-account',
    provider: {
      name: 'provider-a', owner: 'provider-genesis',
      nexusToken: 'token-register', nexusTreasury: 'provider-treasury',
      nexusSymbol: 'USDD', nexusDecimals: 6, solanaMint: 'mint', solanaVault: 'vault',
      solanaSymbol: 'USDC', solanaDecimals: 6, memoPrefix: 'nexus:',
      receiptSchema: 'nexus-swap-receipt-v1',
    },
    quote: { inputAmount: '12.500001', outputAmount: '12.400001' },
    ...overrides,
  };
}

function debitTransaction(overrides = {}) {
  return {
    txid: 'user-debit-txid', confirmations: 4, timestamp: 123456,
    contracts: [{
      id: 3, OP: 'DEBIT', from: { address: 'user-token-account' },
      to: { address: 'provider-treasury' }, amount: '12.500001',
      token: 'token-register', reference: 9,
    }],
    ...overrides,
  };
}

test('verifyDebit requires one finalized contract matching every frozen source term', async () => {
  const rpc = rpcFixture({ 'ledger/get/transaction': { result: debitTransaction() } });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });

  const result = await client.verifyDebit('user-debit-txid', nexusJob());
  assert.equal(result.verified, true);
  assert.equal(result.contractId, 3);
  assert.deepEqual(result.evidence, {
    txid: 'user-debit-txid', contractId: 3, operation: 'DEBIT',
    from: 'user-token-account', to: 'provider-treasury', token: 'token-register',
    amount: '12.500001', reference: '9', confirmations: 4,
  });
  assert.deepEqual(rpc.calls, [{
    endpoint: 'ledger/get/transaction', params: { txid: 'user-debit-txid' },
  }]);
});

test('verifyDebit rejects token, amount, reference, endpoint, and finality mismatches', async (t) => {
  const cases = [
    ['wrong_token', { token: 'other-token' }],
    ['wrong_amount', { amount: '12.500002' }],
    ['wrong_reference', { reference: 10 }],
    ['wrong_destination', { to: 'other-treasury' }],
  ];
  for (const [reason, contractOverride] of cases) {
    await t.test(reason, async () => {
      const tx = debitTransaction();
      tx.contracts[0] = { ...tx.contracts[0], ...contractOverride };
      const client = createNexusClient({ apiCall: async () => tx, secureApiCall: async () => {} });
      assert.deepEqual(await client.verifyDebit(tx.txid, nexusJob()), {
        verified: false, reason: 'no_exact_debit_contract',
      });
    });
  }
  await t.test('timestamp and balance delta do not replace confirmations', async () => {
    const tx = debitTransaction({
      confirmations: 0, timestamp: 9999999999,
      balance: { before: '0', after: '12.500001' },
    });
    const client = createNexusClient({ apiCall: async () => tx, secureApiCall: async () => {} });
    assert.deepEqual(await client.verifyDebit(tx.txid, nexusJob()), {
      verified: false, reason: 'insufficient_finality',
    });
  });
});

const RECEIPT_ENDPOINT = 'register/list/assets:asset/owner,distordiaType,schema,source_signature,solana_mint,solana_vault,nexus_token,nexus_account,output_txid,output_contract_id,output_units,reference,address';

function payoutReceipt(overrides = {}) {
  return {
    address: 'receipt-address', owner: 'provider-genesis',
    distordiaType: 'nexusSwapReceipt', schema: 'nexus-swap-receipt-v1',
    source_signature: 'full-solana-source-signature', solana_mint: 'mint', solana_vault: 'vault',
    nexus_token: 'token-register', nexus_account: 'user-token-account',
    output_txid: 'nexus-output-txid', output_contract_id: '1', output_units: '12400001',
    reference: '777',
    ...overrides,
  };
}

function nexusOutputDebit(overrides = {}) {
  return {
    txid: 'nexus-output-txid', confirmations: 3,
    contracts: [{
      id: 1, OP: 'DEBIT', from: 'token-register', to: 'user-token-account',
      token: 'token-register', amount: '12.400001', reference: '777',
    }],
    ...overrides,
  };
}

test('verifyOutput binds the full Solana signature to provider receipt, exact DEBIT, and spendable CREDIT', async () => {
  const job = nexusJob({
    direction: 'solana-to-nexus', sourceTxid: 'full-solana-source-signature',
  });
  const rpc = rpcFixture({
    [RECEIPT_ENDPOINT]: [payoutReceipt()],
    'ledger/get/transaction': nexusOutputDebit(),
    'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference': [{
      txid: 'recipient-credit-txid', confirmations: 2,
      contracts: [{
        id: 0, OP: 'CREDIT', for: 'DEBIT', txid: 'nexus-output-txid', contract: 1,
        from: 'token-register', to: 'user-token-account', token: 'token-register',
        amount: '12.400001', reference: '777',
      }],
    }],
  });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });

  const result = await client.verifyOutput(null, job);
  assert.equal(result.verified, true);
  assert.equal(result.txid, 'nexus-output-txid');
  assert.equal(result.contractId, 1);
  assert.equal(result.receipt.address, 'receipt-address');
  assert.equal(result.debitEvidence.reference, '777');
  assert.equal(result.claimEvidence.txid, 'recipient-credit-txid');
  assert.deepEqual(rpc.calls[0], {
    endpoint: RECEIPT_ENDPOINT,
    params: { where: 'results.source_signature=full-solana-source-signature', limit: 'none' },
  });
});

test('verifyOutput does not use frontend job.reference for the backend sequential payout reference', async () => {
  const job = nexusJob({
    direction: 'solana-to-nexus', sourceTxid: 'full-solana-source-signature', reference: '9',
  });
  const historyEndpoint = 'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference';
  const rpc = rpcFixture({
    [RECEIPT_ENDPOINT]: [payoutReceipt({ reference: '777' })],
    'ledger/get/transaction': nexusOutputDebit(),
    [historyEndpoint]: [],
  });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });

  const result = await client.verifyOutput('nexus-output-txid', job);
  assert.equal(result.verified, false);
  assert.equal(result.pendingClaim, true);
  assert.equal(result.reason, 'nexus_output_pending_claim');
  assert.equal(result.txid, 'nexus-output-txid');
  assert.equal(result.contractId, 1);
  assert.equal(result.debitEvidence.reference, '777');
});

test('verifyOutput rejects absent, foreign-owned, and ambiguous receipts before ledger proof', async (t) => {
  const job = nexusJob({ direction: 'solana-to-nexus', sourceTxid: 'full-solana-source-signature' });
  for (const [name, receipts, reason] of [
    ['absent', [], 'receipt_not_found'],
    ['foreign owner', [payoutReceipt({ owner: 'other-provider' })], 'receipt_identity_mismatch'],
    ['ambiguous', [payoutReceipt(), payoutReceipt({ address: 'receipt-2' })], 'ambiguous_receipt'],
  ]) {
    await t.test(name, async () => {
      let ledgerReads = 0;
      const client = createNexusClient({
        apiCall: async (endpoint) => {
          if (endpoint === RECEIPT_ENDPOINT) return receipts;
          ledgerReads += 1;
          return null;
        },
        secureApiCall: async () => {},
      });
      assert.deepEqual(await client.verifyOutput('nexus-output-txid', job), {
        verified: false, reason,
      });
      assert.equal(ledgerReads, 0);
    });
  }
});

test('inspectSource resolves user DEBIT to the distinct provider CREDIT identity consumed by swapService', async () => {
  const historyEndpoint = 'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference';
  const rpc = rpcFixture({
    'register/get/finance:account': {
      address: 'user-token-account', owner: 'user-genesis', token: 'token-register',
    },
    'ledger/get/transaction': debitTransaction(),
    [historyEndpoint]: [{
      txid: 'provider-credit-txid', confirmations: 5,
      contracts: [{
        id: 0, OP: 'CREDIT', for: 'DEBIT', txid: 'user-debit-txid', contract: 3,
        from: { address: 'user-token-account' }, to: { address: 'provider-treasury' },
        token: 'token-register', amount: '12.500001', reference: 9,
      }],
    }],
  });
  const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });

  const result = await client.inspectSource(nexusJob({
    debitTxid: 'user-debit-txid', sourceTxid: null,
  }));
  assert.equal(result.resolved, true);
  assert.equal(result.debitTxid, 'user-debit-txid');
  assert.equal(result.sourceTxid, 'provider-credit-txid');
  assert.equal(result.sourceContract, 0);
  assert.equal(result.evidence.linkedDebitContract, 3);
  assert.deepEqual(rpc.calls[2], {
    endpoint: historyEndpoint,
    params: { address: 'provider-treasury', sort: 'timestamp', order: 'desc', limit: 100, offset: 0 },
  });
});

test('inspectSource never substitutes the user debit txid for unresolved service CREDIT evidence', async (t) => {
  await t.test('requires debitTxid separately even if sourceTxid is populated', async () => {
    let reads = 0;
    const client = createNexusClient({ apiCall: async () => { reads += 1; }, secureApiCall: async () => {} });
    assert.deepEqual(await client.inspectSource(nexusJob({ sourceTxid: 'user-debit-txid' })), {
      resolved: false, reason: 'missing_debit_txid',
    });
    assert.equal(reads, 0);
  });

  await t.test('holds when target history omits CREDIT to DEBIT linkage', async () => {
    const historyEndpoint = 'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference';
    const rpc = rpcFixture({
      'register/get/finance:account': {
        address: 'user-token-account', owner: 'user-genesis', token: 'token-register',
      },
      'ledger/get/transaction': debitTransaction(),
      [historyEndpoint]: [{
        txid: 'provider-credit-txid', confirmations: 5,
        contracts: [{
          id: 0, OP: 'CREDIT', from: 'user-token-account', to: 'provider-treasury',
          token: 'token-register', amount: '12.500001', reference: 9,
        }],
      }],
    });
    const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });
    assert.deepEqual(
      await client.inspectSource(nexusJob({ debitTxid: 'user-debit-txid' })),
      { resolved: false, reason: 'credit_linkage_unavailable' },
    );
  });

  await t.test('requires the selected account owner to be the wallet genesis', async () => {
    const client = createNexusClient({
      apiCall: async (endpoint) => {
        assert.equal(endpoint, 'register/get/finance:account');
        return { address: 'user-token-account', owner: 'someone-else', token: 'token-register' };
      },
      secureApiCall: async () => {},
    });
    assert.deepEqual(
      await client.inspectSource(nexusJob({ debitTxid: 'user-debit-txid' })),
      { resolved: false, reason: 'source_account_owner_mismatch' },
    );
  });

  await t.test('rejects a provider CREDIT envelope with sibling treasury credits because mapping is txid-only', async () => {
    const routes = sourceRoutes();
    const historyEndpoint = 'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference';
    routes[historyEndpoint][0].contracts.push({
      id: 1, OP: 'CREDIT', for: 'DEBIT', txid: 'another-debit', contract: 0,
      from: 'another-account', to: 'provider-treasury', token: 'token-register',
      amount: '1.0', reference: '10',
    });
    const rpc = rpcFixture(routes);
    const client = createNexusClient({ apiCall: rpc.call, secureApiCall: async () => {} });
    assert.deepEqual(
      await client.inspectSource(nexusJob({ debitTxid: 'user-debit-txid' })),
      { resolved: false, reason: 'source_credit_mapping_identity_ambiguous' },
    );
  });
});

function sourceRoutes(extra = {}) {
  const historyEndpoint = 'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference';
  return {
    'register/get/finance:account': {
      address: 'user-token-account', owner: 'user-genesis', token: 'token-register',
    },
    'ledger/get/transaction': params => params.txid === 'mapping-create-txid'
      ? {txid:'mapping-create-txid',confirmations:5,contracts:[{id:0,OP:'CREATE',address:'mapping-address'}]}
      : debitTransaction(),
    [historyEndpoint]: [{
      txid: 'provider-credit-txid', confirmations: 5,
      contracts: [{
        id: 0, OP: 'CREDIT', for: 'DEBIT', txid: 'user-debit-txid', contract: 3,
        from: 'user-token-account', to: 'provider-treasury', token: 'token-register',
        amount: '12.500001', reference: '9',
      }],
    }],
    ...extra,
  };
}

test('publishMapping creates once without a custom owner and returns only after exact readback', async () => {
  const writes = [];
  const rpc = rpcFixture(sourceRoutes({
    'assets/list/asset': [],
    'register/get/assets:asset': {
      address: 'mapping-address', owner: 'user-genesis',
      txid_toService: 'provider-credit-txid', receival_account: 'solana-token-account',
    },
  }));
  const client = createNexusClient({
    apiCall: rpc.call,
    secureApiCall: async (endpoint, params) => {
      writes.push({ endpoint, params });
      return { success: true, address: 'mapping-address', txid: 'mapping-create-txid' };
    },
  });
  const job = nexusJob({
    debitTxid: 'user-debit-txid', sourceTxid: 'provider-credit-txid', sourceContract: '0',
  });

  assert.deepEqual(await client.publishMapping(job), {
    address: 'mapping-address', txid: 'mapping-create-txid',
  });
  assert.deepEqual(writes, [{
    endpoint: 'assets/create/asset',
    params: {
      format: 'basic', txid_toService: 'provider-credit-txid',
      receival_account: 'solana-token-account',
    },
  }]);
  assert.equal('owner' in writes[0].params, false);
  assert.equal('name' in writes[0].params, false);
  assert.equal(job.sourceContract, '0');
  assert.deepEqual(rpc.calls.slice(-2), [{
    endpoint: 'register/get/assets:asset', params: { address: 'mapping-address' },
  }, {
    endpoint: 'ledger/get/transaction', params: {txid:'mapping-create-txid'},
  }]);
});

test('publishMapping rejects malformed persisted contract ids without rewriting their literal value', async () => {
  let writes = 0;
  const client = createNexusClient({
    apiCall: rpcFixture(sourceRoutes()).call,
    secureApiCall: async () => { writes += 1; },
  });
  const job = nexusJob({
    debitTxid: 'user-debit-txid', sourceTxid: 'provider-credit-txid', sourceContract: '00',
  });
  assert.deepEqual(await client.publishMapping(job), {
    resolved: false, reason: 'source_identity_mismatch',
  });
  assert.equal(job.sourceContract, '00');
  assert.equal(writes, 0);
});

test('publishMapping never overwrites or duplicates an existing mapping', async (t) => {
  await t.test('reuses only an exact persisted mapping with its persisted create txid', async () => {
    let writes = 0;
    const existing = {
      address: 'mapping-address', owner: 'user-genesis',
      txid_toService: 'provider-credit-txid', receival_account: 'solana-token-account',
    };
    const rpc = rpcFixture(sourceRoutes({
      'assets/list/asset': [existing],
      'register/get/assets:asset': existing,
    }));
    const client = createNexusClient({
      apiCall: rpc.call, secureApiCall: async () => { writes += 1; },
    });
    const result = await client.publishMapping(nexusJob({
      debitTxid: 'user-debit-txid', sourceTxid: 'provider-credit-txid', sourceContract: 0,
      mappingAddress: 'mapping-address', mappingTxid: 'mapping-create-txid',
    }));
    assert.deepEqual(result, { address: 'mapping-address', txid: 'mapping-create-txid' });
    assert.equal(writes, 0);
  });

  await t.test('holds a conflicting mapping and performs no write', async () => {
    let writes = 0;
    const rpc = rpcFixture(sourceRoutes({
      'assets/list/asset': [{
        address: 'attacker-choice', owner: 'user-genesis',
        txid_toService: 'provider-credit-txid', receival_account: 'different-solana-account',
      }],
    }));
    const client = createNexusClient({
      apiCall: rpc.call, secureApiCall: async () => { writes += 1; },
    });
    assert.deepEqual(await client.publishMapping(nexusJob({
      debitTxid: 'user-debit-txid', sourceTxid: 'provider-credit-txid', sourceContract: 0,
    })), { resolved: false, reason: 'mapping_conflict' });
    assert.equal(writes, 0);
  });
});

test('publishMapping treats write errors and mismatched readback as unresolved', async (t) => {
  const job = nexusJob({
    debitTxid: 'user-debit-txid', sourceTxid: 'provider-credit-txid', sourceContract: 0,
  });
  await t.test('write outcome unknown', async () => {
    const rpc = rpcFixture(sourceRoutes({ 'assets/list/asset': [] }));
    const client = createNexusClient({
      apiCall: rpc.call, secureApiCall: async () => { throw new Error('wallet timeout'); },
    });
    assert.deepEqual(await client.publishMapping(job), {
      resolved: false, reason: 'mapping_create_outcome_unknown',
    });
  });
  await t.test('owner readback mismatch', async () => {
    const rpc = rpcFixture(sourceRoutes({
      'assets/list/asset': [],
      'register/get/assets:asset': {
        address: 'mapping-address', owner: 'different-owner',
        txid_toService: 'provider-credit-txid', receival_account: 'solana-token-account',
      },
    }));
    const client = createNexusClient({
      apiCall: rpc.call,
      secureApiCall: async () => ({
        success: true, address: 'mapping-address', txid: 'mapping-create-txid',
      }),
    });
    assert.deepEqual(await client.publishMapping(job), {
      resolved: false, reason: 'mapping_readback_mismatch',
      address: 'mapping-address', txid: 'mapping-create-txid',
    });
  });

  await t.test('readback outage preserves parsed remote identity without claiming success', async () => {
    const rpc = rpcFixture(sourceRoutes({
      'assets/list/asset': [],
      'register/get/assets:asset': () => { throw new Error('index unavailable'); },
    }));
    const client = createNexusClient({
      apiCall: rpc.call,
      secureApiCall: async () => ({
        success: true, address: 'mapping-address', txid: 'mapping-create-txid',
      }),
    });
    assert.deepEqual(await client.publishMapping(job), {
      resolved: false, reason: 'mapping_readback_unavailable',
      address: 'mapping-address', txid: 'mapping-create-txid',
    });
  });
});

test('inspectSource directly verifies an explicit CREDIT txid and canonical contract id', async () => {
  const historyEndpoint = 'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference';
  const routes=sourceRoutes();
  routes['ledger/get/transaction']=params=>params.txid==='user-debit-txid' ? debitTransaction() : {
    txid:'older-provider-credit',confirmations:5,contracts:[{id:7,OP:'CREDIT',for:'DEBIT',txid:'user-debit-txid',contract:3,
      from:'user-token-account',to:'provider-treasury',token:'token-register',amount:'12.500001',reference:'9'}],
  };
  const rpc=rpcFixture(routes); const client=createNexusClient({apiCall:rpc.call,secureApiCall:async()=>{}});
  const result=await client.inspectSource(nexusJob({debitTxid:'user-debit-txid'}),{txid:'older-provider-credit',sourceContract:'7',manual:true});
  assert.equal(result.resolved,true); assert.equal(result.sourceTxid,'older-provider-credit'); assert.equal(result.sourceContract,7);
  assert.equal(rpc.calls.some(call=>call.endpoint===historyEndpoint),false);
});

test('verifyMapping requires exact finalized CREATE transaction and asset terms', async () => {
  const rpc=rpcFixture({
    'register/get/assets:asset':{address:'mapping-address',owner:'user-genesis',txid_toService:'provider-credit-txid',receival_account:'solana-token-account'},
    'ledger/get/transaction':{txid:'mapping-create-txid',confirmations:3,contracts:[{id:0,OP:'CREATE',address:'mapping-address'}]},
  });
  const client=createNexusClient({apiCall:rpc.call,secureApiCall:async()=>{}});
  const result=await client.verifyMapping('mapping-address','mapping-create-txid',nexusJob({debitTxid:'user-debit-txid',sourceTxid:'provider-credit-txid',sourceContract:'0'}));
  assert.equal(result.verified,true);
});

test('verifyOutput paginates bounded claim history until an older exact claim is found', async () => {
  const historyEndpoint = 'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference';
  const job=nexusJob({direction:'solana-to-nexus',sourceTxid:'full-solana-source-signature'});
  const filler=Array.from({length:100},(_,index)=>({txid:`filler-${index}`,confirmations:3,contracts:[]}));
  const rpc=rpcFixture({
    [RECEIPT_ENDPOINT]:[payoutReceipt()],
    'ledger/get/transaction':nexusOutputDebit(),
    [historyEndpoint]:({offset})=>offset===0 ? filler : [{txid:'old-claim',confirmations:3,contracts:[{id:0,OP:'CREDIT',for:'DEBIT',txid:'nexus-output-txid',contract:1,from:'token-register',to:'user-token-account',token:'token-register',amount:'12.400001',reference:'777'}]}],
  });
  const client=createNexusClient({apiCall:rpc.call,secureApiCall:async()=>{}});
  const result=await client.verifyOutput(null,job);
  assert.equal(result.verified,true); assert.equal(result.claimEvidence.txid,'old-claim');
  assert.equal(rpc.calls.some(call=>call.endpoint===historyEndpoint && call.params.offset===100),true);
});
