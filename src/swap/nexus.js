'use strict';

function assertRpcFunction(value, name) {
  if (typeof value !== 'function') throw new TypeError(`${name} must be a function`);
}

function unwrap(response, endpoint) {
  if (response && typeof response === 'object' && !Array.isArray(response)) {
    if (Object.prototype.hasOwnProperty.call(response, 'error')) {
      const error = response.error;
      const message = error && typeof error === 'object' ? error.message : error;
      throw new Error(`Nexus API ${endpoint} failed: ${String(message || 'unknown error')}`);
    }
    if (Object.prototype.hasOwnProperty.call(response, 'result')) return response.result;
  }
  return response;
}

function networkName(info) {
  if (!info || typeof info !== 'object' || Array.isArray(info)) {
    throw new Error('Nexus system/get/info returned an invalid response');
  }
  if (info.private === true) return 'private';
  if (Object.prototype.hasOwnProperty.call(info, 'testnet') && info.testnet !== false && info.testnet !== null) {
    const testnet = info.testnet === true ? 1 : info.testnet;
    if (!Number.isInteger(testnet) || testnet < 0) {
      throw new Error('Nexus system/get/info returned an invalid testnet identifier');
    }
    return `testnet:${testnet}`;
  }
  return 'mainnet';
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${field} is required`);
  return value;
}

function requireDecimals(value) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new TypeError('provider.nexusDecimals must be an integer from 0 to 255');
  }
  return value;
}

function requireAmount(value, decimals) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new TypeError('Nexus amount must be a non-scientific decimal string');
  }
  const [, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new RangeError('Nexus amount exceeds token decimals');
  const units = BigInt(value.replace('.', '') + '0'.repeat(decimals - fraction.length));
  if (units <= 0n) throw new RangeError('Nexus amount must be positive');
  return value;
}

function requireReference(value) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/.test(value)) {
    throw new TypeError('reference must be a canonical uint64 decimal string');
  }
  const parsed = BigInt(value);
  if (parsed > 18446744073709551615n) throw new RangeError('reference exceeds uint64');
  return value;
}

function amountUnits(value, decimals) {
  const text = typeof value === 'number' && Number.isFinite(value) ? String(value) : value;
  requireAmount(text, decimals);
  const [whole, fraction = ''] = text.split('.');
  return BigInt(whole + fraction + '0'.repeat(decimals - fraction.length));
}

function contractAddress(value) {
  if (typeof value === 'string' && value) return value;
  if (value && typeof value === 'object' && !Array.isArray(value)
      && typeof value.address === 'string' && value.address) return value.address;
  return null;
}

function wireReference(value) {
  if (typeof value === 'string') {
    try { return requireReference(value); } catch { return null; }
  }
  if (Number.isSafeInteger(value) && value >= 0) return String(value);
  return null;
}

function requiredFinality(job) {
  const value = job && job.nexusMinConfirmations;
  if (!Number.isInteger(value) || value < 1) {
    throw new TypeError('job.nexusMinConfirmations must be a positive integer');
  }
  return value;
}

async function verifyTransactionDebit(apiCall, txid, job, terms) {
  try {
    requireString(txid, 'txid');
    const decimals = requireDecimals(job && job.provider && job.provider.nexusDecimals);
    const minimum = requiredFinality(job);
    const expected = {
      from: requireString(terms.from, 'expected debit source'),
      to: requireString(terms.to, 'expected debit destination'),
      token: requireString(job.provider.nexusToken, 'provider.nexusToken'),
      amount: requireAmount(terms.amount, decimals),
      reference: requireReference(job.reference),
    };
    const endpoint = 'ledger/get/transaction';
    const tx = unwrap(await apiCall(endpoint, { txid }), endpoint);
    if (!tx || typeof tx !== 'object' || Array.isArray(tx) || tx.txid !== txid) {
      return { verified: false, reason: 'transaction_identity_mismatch' };
    }
    if (!Number.isInteger(tx.confirmations) || tx.confirmations < minimum) {
      return { verified: false, reason: 'insufficient_finality' };
    }
    if (!Array.isArray(tx.contracts)) return { verified: false, reason: 'invalid_contracts' };
    const expectedUnits = amountUnits(expected.amount, decimals);
    const matches = [];
    for (const contract of tx.contracts) {
      if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
        return { verified: false, reason: 'invalid_contract_schema' };
      }
      if (String(contract.OP || '').toUpperCase() !== 'DEBIT') continue;
      if (!Number.isInteger(contract.id) || contract.id < 0) {
        return { verified: false, reason: 'invalid_contract_schema' };
      }
      let observedUnits;
      try { observedUnits = amountUnits(contract.amount, decimals); } catch { continue; }
      const observedReference = wireReference(contract.reference);
      if (contractAddress(contract.from) === expected.from
          && contractAddress(contract.to) === expected.to
          && contract.token === expected.token
          && observedUnits === expectedUnits
          && observedReference === expected.reference) {
        matches.push({
          txid, contractId: contract.id, operation: 'DEBIT',
          from: expected.from, to: expected.to, token: expected.token,
          amount: String(contract.amount), reference: observedReference,
          confirmations: tx.confirmations,
        });
      }
    }
    if (matches.length === 0) return { verified: false, reason: 'no_exact_debit_contract' };
    if (matches.length !== 1) return { verified: false, reason: 'ambiguous_exact_debit_contract' };
    return { verified: true, txid, contractId: matches[0].contractId, evidence: matches[0] };
  } catch (error) {
    return { verified: false, reason: 'unresolved_transaction_evidence', error: error.message };
  }
}

const TREASURY_HISTORY_ENDPOINT = 'register/transactions/finance:account/txid,confirmations,contracts.id,contracts.OP,contracts.for,contracts.txid,contracts.contract,contracts.from,contracts.to,contracts.amount,contracts.token,contracts.reference';
const RECEIPT_ENDPOINT = 'register/list/assets:asset/owner,distordiaType,schema,source_signature,solana_mint,solana_vault,nexus_token,nexus_account,output_txid,output_contract_id,output_units,reference,address';
const RECEIPT_SCHEMA = 'nexus-swap-receipt-v1';

function canonicalUnsigned(value, { positive = false } = {}) {
  if (typeof value !== 'string' || !/^(?:0|[1-9]\d*)$/.test(value)) return null;
  const parsed = BigInt(value);
  if (positive && parsed === 0n) return null;
  return parsed;
}

function canonicalContractId(value) {
  if (typeof value === 'bigint' && value >= 0n && value <= BigInt(Number.MAX_SAFE_INTEGER)) return value;
  if (Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  const parsed = canonicalUnsigned(value);
  return parsed !== null && parsed <= BigInt(Number.MAX_SAFE_INTEGER) ? parsed : null;
}

function sameContractId(expected, observed) {
  const expectedId = canonicalContractId(expected);
  const observedId = canonicalContractId(observed);
  return expectedId !== null && observedId !== null && expectedId === observedId;
}

function exactCreditTerms(contract, job, expectedUnits, debitContractId) {
  const decimals = job.provider.nexusDecimals;
  let observedUnits;
  try { observedUnits = amountUnits(contract.amount, decimals); } catch { return false; }
  return contractAddress(contract.from) === job.nexusAccount
    && contractAddress(contract.to) === job.provider.nexusTreasury
    && contract.token === job.provider.nexusToken
    && observedUnits === expectedUnits
    && wireReference(contract.reference) === job.reference
    && String(contract.for || '').toUpperCase() === 'DEBIT'
    && contract.txid === job.debitTxid
    && sameContractId(contract.contract, debitContractId);
}

function createNexusClient({ apiCall, secureApiCall } = {}) {
  assertRpcFunction(apiCall, 'apiCall');
  assertRpcFunction(secureApiCall, 'secureApiCall');

  const client = {
    async loadContext() {
      const [profileResponse, infoResponse] = await Promise.all([
        apiCall('profiles/status/master', {}),
        apiCall('system/get/info', {}),
      ]);
      const profile = unwrap(profileResponse, 'profiles/status/master');
      const info = unwrap(infoResponse, 'system/get/info');
      if (!profile || typeof profile !== 'object' || Array.isArray(profile)
          || typeof profile.genesis !== 'string' || !profile.genesis) {
        throw new Error('Nexus profile status is missing genesis');
      }
      return { genesis: profile.genesis, nexusNetwork: networkName(info) };
    },

    async loadPair(provider) {
      if (!provider || typeof provider !== 'object' || Array.isArray(provider)
          || typeof provider.nexusToken !== 'string' || !provider.nexusToken) {
        throw new TypeError('provider.nexusToken is required');
      }
      const response = await apiCall('register/get/finance:token', {
        address: provider.nexusToken,
      });
      const token = unwrap(response, 'register/get/finance:token');
      if (!token || typeof token !== 'object' || Array.isArray(token)) {
        throw new Error('Nexus token lookup returned an invalid response');
      }
      if (token.address !== provider.nexusToken) {
        throw new Error('Nexus token register identity mismatch');
      }
      if (!Number.isInteger(token.decimals) || token.decimals < 0) {
        throw new Error('Nexus token decimals are invalid');
      }
      if (provider.nexusDecimals !== undefined && provider.nexusDecimals !== token.decimals) {
        throw new Error('Nexus token decimals mismatch');
      }
      if (provider.nexusSymbol !== undefined && token.ticker !== undefined
          && provider.nexusSymbol !== token.ticker) {
        throw new Error('Nexus token ticker mismatch');
      }
      return { ...provider, nexusDecimals: token.decimals };
    },

    async listAccounts(provider, genesis) {
      const token = requireString(provider && provider.nexusToken, 'provider.nexusToken');
      const owner = requireString(genesis, 'genesis');
      const endpoint = 'register/list/finance:account';
      const response = await apiCall(endpoint, {
        where: `results.owner=${owner} AND results.token=${token}`,
        limit: 100,
      });
      const accounts = unwrap(response, endpoint);
      if (!Array.isArray(accounts)) throw new Error('Nexus account list returned an invalid response');
      for (const account of accounts) {
        if (!account || typeof account !== 'object' || Array.isArray(account)
            || typeof account.address !== 'string' || !account.address) {
          throw new Error('Nexus account list returned an invalid account');
        }
        if (account.owner !== owner || account.token !== token) {
          throw new Error('Nexus account list query mismatch');
        }
      }
      return accounts;
    },

    async submitDebit(job) {
      if (!job || job.direction !== 'nexus-to-solana') {
        throw new TypeError('submitDebit requires a nexus-to-solana job');
      }
      const provider = job.provider;
      const decimals = requireDecimals(provider && provider.nexusDecimals);
      const params = {
        from: requireString(job.nexusAccount, 'job.nexusAccount'),
        to: requireString(provider && provider.nexusTreasury, 'provider.nexusTreasury'),
        amount: requireAmount(job.quote && job.quote.inputAmount, decimals),
        reference: requireReference(job.reference),
      };
      const endpoint = 'finance/debit/account';
      const response = unwrap(await secureApiCall(endpoint, params), endpoint);
      if (!response || typeof response !== 'object' || Array.isArray(response)
          || response.success !== true || typeof response.txid !== 'string' || !response.txid) {
        throw new Error('Nexus debit outcome is unresolved: missing authoritative txid');
      }
      return { txid: response.txid };
    },

    async inspectSource(job, candidate = null) {
      if (!job || job.direction !== 'nexus-to-solana') {
        return { resolved: false, reason: 'wrong_direction' };
      }
      if (typeof job.debitTxid !== 'string' || !job.debitTxid) {
        return { resolved: false, reason: 'missing_debit_txid' };
      }
      try {
        const accountEndpoint = 'register/get/finance:account';
        const account = unwrap(await apiCall(accountEndpoint, { address: job.nexusAccount }), accountEndpoint);
        if (!account || typeof account !== 'object' || Array.isArray(account)
            || account.address !== job.nexusAccount || account.token !== job.provider.nexusToken) {
          return { resolved: false, reason: 'source_account_identity_mismatch' };
        }
        if (account.owner !== job.scope?.genesis) {
          return { resolved: false, reason: 'source_account_owner_mismatch' };
        }

        const debit = await verifyTransactionDebit(apiCall, job.debitTxid, job, {
          from: job.nexusAccount,
          to: job.provider.nexusTreasury,
          amount: job.quote && job.quote.inputAmount,
        });
        if (!debit.verified) {
          return { resolved: false, reason: `debit_${debit.reason}` };
        }

        const decimals = requireDecimals(job.provider.nexusDecimals);
        const expectedUnits = amountUnits(job.quote.inputAmount, decimals);
        if (candidate !== null && candidate !== undefined) {
          const candidateTxid = candidate && candidate.txid;
          const candidateContract = candidate && candidate.sourceContract;
          const contractId = canonicalContractId(candidateContract);
          if (typeof candidateTxid !== 'string' || !candidateTxid || contractId === null) {
            return {resolved:false, reason:'invalid_manual_source_identity'};
          }
          const endpoint = 'ledger/get/transaction';
          const transaction = unwrap(await apiCall(endpoint, {txid:candidateTxid}), endpoint);
          if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)
              || transaction.txid !== candidateTxid || !Array.isArray(transaction.contracts)) {
            return {resolved:false, reason:'source_transaction_identity_mismatch'};
          }
          if (!Number.isInteger(transaction.confirmations) || transaction.confirmations < requiredFinality(job)) {
            return {resolved:false, reason:'source_credit_insufficient_finality'};
          }
          const matches = transaction.contracts.filter(contract => contract && typeof contract === 'object'
            && !Array.isArray(contract) && String(contract.OP || '').toUpperCase() === 'CREDIT'
            && sameContractId(contract.id, contractId)
            && exactCreditTerms(contract, job, expectedUnits, debit.contractId));
          if (matches.length !== 1) return {resolved:false, reason:'no_exact_manual_source_credit'};
          const contract = matches[0];
          const evidence = {
            txid:candidateTxid, contractId:Number(contractId), operation:'CREDIT',
            linkedDebitTxid:contract.txid, linkedDebitContract:Number(canonicalContractId(contract.contract)),
            from:job.nexusAccount, to:job.provider.nexusTreasury, token:job.provider.nexusToken,
            amount:String(contract.amount), reference:wireReference(contract.reference), confirmations:transaction.confirmations,
          };
          return {resolved:true, debitTxid:job.debitTxid, sourceTxid:candidateTxid,
            sourceContract:Number(contractId), contractId:Number(contractId), evidence};
        }

        const response = await apiCall(TREASURY_HISTORY_ENDPOINT, {
          address: job.provider.nexusTreasury,
          sort: 'timestamp', order: 'desc', limit: 100, offset: 0,
        });
        const transactions = unwrap(response, TREASURY_HISTORY_ENDPOINT);
        if (!Array.isArray(transactions)) {
          return { resolved: false, reason: 'invalid_treasury_history' };
        }
        const matches = [];
        const treasuryCreditsByTxid = new Map();
        let linkageUnavailable = false;
        for (const tx of transactions) {
          if (!tx || typeof tx !== 'object' || Array.isArray(tx)
              || typeof tx.txid !== 'string' || !tx.txid || !Array.isArray(tx.contracts)) {
            return { resolved: false, reason: 'invalid_treasury_history' };
          }
          if (!Number.isInteger(tx.confirmations)) {
            return { resolved: false, reason: 'invalid_treasury_history_finality' };
          }
          for (const contract of tx.contracts) {
            if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
              return { resolved: false, reason: 'invalid_source_credit_evidence' };
            }
            if (String(contract.OP || '').toUpperCase() !== 'CREDIT') continue;
            if (contractAddress(contract.to) === job.provider.nexusTreasury) {
              treasuryCreditsByTxid.set(tx.txid, (treasuryCreditsByTxid.get(tx.txid) || 0) + 1);
            }
            const sameTransfer = (() => {
              let units;
              try { units = amountUnits(contract.amount, decimals); } catch { return false; }
              return contractAddress(contract.from) === job.nexusAccount
                && contractAddress(contract.to) === job.provider.nexusTreasury
                && contract.token === job.provider.nexusToken
                && units === expectedUnits
                && wireReference(contract.reference) === job.reference;
            })();
            if (sameTransfer && (contract.txid === undefined || contract.contract === undefined
                || contract.for === undefined)) linkageUnavailable = true;
            if (!exactCreditTerms(contract, job, expectedUnits, debit.contractId)) continue;
            if (!Number.isInteger(contract.id) || contract.id < 0) {
              return { resolved: false, reason: 'invalid_source_credit_evidence' };
            }
            if (tx.confirmations < requiredFinality(job)) {
              return { resolved: false, reason: 'source_credit_insufficient_finality' };
            }
            matches.push({
              txid: tx.txid, contractId: contract.id, operation: 'CREDIT',
              linkedDebitTxid: contract.txid, linkedDebitContract: contract.contract,
              from: job.nexusAccount, to: job.provider.nexusTreasury,
              token: job.provider.nexusToken, amount: String(contract.amount),
              reference: wireReference(contract.reference), confirmations: tx.confirmations,
            });
          }
        }
        if (matches.length === 0 && linkageUnavailable) {
          return { resolved: false, reason: 'credit_linkage_unavailable' };
        }
        if (matches.length === 0) {
          return { resolved: false, reason: 'source_credit_not_found_unverified' };
        }
        if (matches.length !== 1) {
          return { resolved: false, reason: 'ambiguous_source_credit' };
        }
        const evidence = matches[0];
        if (treasuryCreditsByTxid.get(evidence.txid) !== 1) {
          return { resolved: false, reason: 'source_credit_mapping_identity_ambiguous' };
        }
        return {
          resolved: true,
          debitTxid: job.debitTxid,
          sourceTxid: evidence.txid,
          sourceContract: evidence.contractId,
          contractId: evidence.contractId,
          evidence,
        };
      } catch (error) {
        return { resolved: false, reason: 'source_evidence_unavailable', error: error.message };
      }
    },

    async verifyMapping(address, txid, job) {
      try {
        requireString(address, 'mapping address');
        requireString(txid, 'mapping create transaction id');
        if (!job || job.direction !== 'nexus-to-solana') return {verified:false, reason:'wrong_direction'};
        const assetEndpoint = 'register/get/assets:asset';
        let asset = unwrap(await apiCall(assetEndpoint, {address}), assetEndpoint);
        if (Array.isArray(asset) && asset.length === 1) [asset] = asset;
        if (!asset || typeof asset !== 'object' || Array.isArray(asset) || asset.address !== address
            || asset.owner !== job.scope?.genesis || asset.txid_toService !== job.sourceTxid
            || asset.receival_account !== job.solanaAccount) {
          return {verified:false, reason:'mapping_asset_identity_mismatch'};
        }
        const endpoint = 'ledger/get/transaction';
        const transaction = unwrap(await apiCall(endpoint, {txid}), endpoint);
        if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)
            || transaction.txid !== txid || !Array.isArray(transaction.contracts)) {
          return {verified:false, reason:'mapping_create_identity_mismatch'};
        }
        if (!Number.isInteger(transaction.confirmations) || transaction.confirmations < requiredFinality(job)) {
          return {verified:false, reason:'mapping_create_insufficient_finality'};
        }
        const creates = transaction.contracts.filter(contract => contract && typeof contract === 'object'
          && !Array.isArray(contract) && String(contract.OP || '').toUpperCase() === 'CREATE'
          && contractAddress(contract.address) === address);
        if (creates.length !== 1) return {verified:false, reason:'no_exact_mapping_create'};
        return {verified:true,address,txid,evidence:{operation:'CREATE',address,confirmations:transaction.confirmations}};
      } catch (error) {
        return {verified:false,reason:'mapping_verification_unavailable',error:error.message};
      }
    },

    async publishMapping(job, options = {}) {
      if (!job || job.direction !== 'nexus-to-solana') {
        return { resolved: false, reason: 'wrong_direction' };
      }
      if (typeof job.sourceTxid !== 'string' || !job.sourceTxid) {
        return { resolved: false, reason: 'missing_source_txid' };
      }
      if (typeof job.scope?.genesis !== 'string' || !job.scope?.genesis
          || typeof job.solanaAccount !== 'string' || !job.solanaAccount) {
        return { resolved: false, reason: 'invalid_mapping_terms' };
      }

      const source = await client.inspectSource(job);
      if (!source.resolved) return source;
      if (source.sourceTxid !== job.sourceTxid
          || (job.sourceContract !== undefined
            && !sameContractId(job.sourceContract, source.sourceContract))) {
        return { resolved: false, reason: 'source_identity_mismatch' };
      }

      let assets;
      try {
        assets = unwrap(await apiCall('assets/list/asset', { limit: 'none' }), 'assets/list/asset');
      } catch {
        return { resolved: false, reason: 'mapping_preflight_unavailable' };
      }
      if (!Array.isArray(assets)) return { resolved: false, reason: 'invalid_mapping_preflight' };
      const existing = assets.filter((asset) => asset && typeof asset === 'object'
        && !Array.isArray(asset) && asset.txid_toService === job.sourceTxid);
      if (existing.length > 1) return { resolved: false, reason: 'ambiguous_existing_mapping' };

      let address;
      let mappingTxid;
      if (existing.length === 1) {
        const mapping = existing[0];
        if (typeof mapping.address !== 'string' || !mapping.address
            || mapping.owner !== job.scope?.genesis
            || mapping.receival_account !== job.solanaAccount) {
          return { resolved: false, reason: 'mapping_conflict' };
        }
        if (job.mappingAddress !== mapping.address
            || typeof job.mappingTxid !== 'string' || !job.mappingTxid) {
          return { resolved: false, reason: 'mapping_exists_without_persisted_identity' };
        }
        address = mapping.address;
        mappingTxid = job.mappingTxid;
      } else {
        if (job.mappingStartedAt && options.allowCreate !== true) {
          return {resolved:false, reason:'mapping_create_outcome_unknown'};
        }
        let created;
        try {
          created = unwrap(await secureApiCall('assets/create/asset', {
            format: 'basic',
            txid_toService: job.sourceTxid,
            receival_account: job.solanaAccount,
          }), 'assets/create/asset');
        } catch {
          return { resolved: false, reason: 'mapping_create_outcome_unknown' };
        }
        if (!created || typeof created !== 'object' || Array.isArray(created)
            || created.success !== true || typeof created.address !== 'string' || !created.address
            || typeof created.txid !== 'string' || !created.txid) {
          return { resolved: false, reason: 'mapping_create_outcome_unknown' };
        }
        address = created.address;
        mappingTxid = created.txid;
      }

      let readback;
      try {
        readback = unwrap(await apiCall('register/get/assets:asset', { address }),
          'register/get/assets:asset');
      } catch {
        return {
          resolved: false, reason: 'mapping_readback_unavailable', address, txid: mappingTxid,
        };
      }
      if (Array.isArray(readback) && readback.length === 1) [readback] = readback;
      if (!readback || typeof readback !== 'object' || Array.isArray(readback)
          || readback.address !== address || readback.owner !== job.scope?.genesis
          || readback.txid_toService !== job.sourceTxid
          || readback.receival_account !== job.solanaAccount) {
        return {
          resolved: false, reason: 'mapping_readback_mismatch', address, txid: mappingTxid,
        };
      }
      const verified = await client.verifyMapping(address, mappingTxid, job);
      if (!verified.verified) {
        return {resolved:false, reason:verified.reason, address, txid:mappingTxid};
      }
      return { address, txid: mappingTxid };
    },

    async verifyDebit(txid, job) {
      if (!job || job.direction !== 'nexus-to-solana') {
        return { verified: false, reason: 'wrong_direction' };
      }
      return verifyTransactionDebit(apiCall, txid, job, {
        from: job.nexusAccount,
        to: job.provider && job.provider.nexusTreasury,
        amount: job.quote && job.quote.inputAmount,
      });
    },

    async verifyOutput(txid, job) {
      if (!job || job.direction !== 'solana-to-nexus') {
        return { verified: false, reason: 'wrong_direction' };
      }
      if ((txid !== null && txid !== undefined && (typeof txid !== 'string' || !txid))
          || typeof job.sourceTxid !== 'string' || !job.sourceTxid) {
        return { verified: false, reason: 'missing_output_identity' };
      }
      const expectedTxid = typeof txid === 'string' ? txid : null;
      const provider = job.provider || {};
      if (provider.receiptSchema !== RECEIPT_SCHEMA) {
        return { verified: false, reason: 'receipt_schema_not_advertised' };
      }
      let receipts;
      try {
        receipts = unwrap(await apiCall(RECEIPT_ENDPOINT, {
          where: `results.source_signature=${job.sourceTxid}`,
          limit: 'none',
        }), RECEIPT_ENDPOINT);
      } catch {
        return { verified: false, reason: 'receipt_lookup_unavailable' };
      }
      if (!Array.isArray(receipts)) return { verified: false, reason: 'invalid_receipt_response' };

      let expectedUnits;
      try {
        expectedUnits = amountUnits(job.quote && job.quote.outputAmount,
          requireDecimals(provider.nexusDecimals));
        requiredFinality(job);
        requireString(provider.owner, 'provider.owner');
        requireString(provider.solanaMint, 'provider.solanaMint');
        requireString(provider.solanaVault, 'provider.solanaVault');
        requireString(provider.nexusToken, 'provider.nexusToken');
        requireString(job.nexusAccount, 'job.nexusAccount');
      } catch {
        return { verified: false, reason: 'invalid_output_terms' };
      }

      const sameSource = receipts.filter((receipt) => receipt && typeof receipt === 'object'
        && !Array.isArray(receipt) && receipt.source_signature === job.sourceTxid);
      if (sameSource.length === 0) return { verified: false, reason: 'receipt_not_found' };
      const exact = [];
      for (const receipt of sameSource) {
        const contractId = canonicalUnsigned(receipt.output_contract_id);
        const outputUnits = canonicalUnsigned(receipt.output_units, { positive: true });
        let reference = null;
        try { reference = requireReference(receipt.reference); } catch { /* invalid */ }
        if (typeof receipt.address === 'string' && receipt.address
            && receipt.owner === provider.owner
            && receipt.distordiaType === 'nexusSwapReceipt'
            && receipt.schema === RECEIPT_SCHEMA
            && receipt.schema === provider.receiptSchema
            && receipt.solana_mint === provider.solanaMint
            && receipt.solana_vault === provider.solanaVault
            && receipt.nexus_token === provider.nexusToken
            && receipt.nexus_account === job.nexusAccount
            && typeof receipt.output_txid === 'string' && receipt.output_txid
            && (expectedTxid === null || receipt.output_txid === expectedTxid)
            && contractId !== null && outputUnits === expectedUnits && reference !== null) {
          exact.push({
            receipt, contractId: Number(contractId), reference, outputTxid: receipt.output_txid,
          });
        }
      }
      if (exact.length === 0) return { verified: false, reason: 'receipt_identity_mismatch' };
      if (exact.length !== 1) return { verified: false, reason: 'ambiguous_receipt' };
      const selected = exact[0];
      if (!Number.isSafeInteger(selected.contractId)) {
        return { verified: false, reason: 'invalid_receipt_contract_id' };
      }

      const outputTxid = selected.outputTxid;
      const receiptJob = { ...job, reference: selected.reference };
      const debit = await verifyTransactionDebit(apiCall, outputTxid, receiptJob, {
        from: provider.nexusToken,
        to: job.nexusAccount,
        amount: job.quote && job.quote.outputAmount,
      });
      if (!debit.verified) return { verified: false, reason: `output_${debit.reason}` };
      if (debit.contractId !== selected.contractId) {
        return { verified: false, reason: 'receipt_debit_contract_mismatch' };
      }

      const history = [];
      let claimHistoryComplete = false;
      try {
        for (let page = 0; page < 20; page += 1) {
          const batch = unwrap(await apiCall(TREASURY_HISTORY_ENDPOINT, {
            address: job.nexusAccount,
            sort: 'timestamp', order: 'desc', limit: 100, offset: page * 100,
          }), TREASURY_HISTORY_ENDPOINT);
          if (!Array.isArray(batch)) return { verified: false, reason: 'invalid_claim_history' };
          history.push(...batch);
          if (batch.length < 100) { claimHistoryComplete = true; break; }
        }
      } catch {
        return { verified: false, reason: 'claim_lookup_unavailable' };
      }
      const claims = [];
      let linkedMismatch = false;
      for (const claimTx of history) {
        if (!claimTx || typeof claimTx !== 'object' || Array.isArray(claimTx)
            || typeof claimTx.txid !== 'string' || !claimTx.txid
            || !Number.isInteger(claimTx.confirmations) || !Array.isArray(claimTx.contracts)) {
          return { verified: false, reason: 'invalid_claim_history' };
        }
        for (const contract of claimTx.contracts) {
          if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
            return { verified: false, reason: 'invalid_claim_evidence' };
          }
          if (String(contract.OP || '').toUpperCase() !== 'CREDIT') continue;
          const linked = String(contract.for || '').toUpperCase() === 'DEBIT'
            && contract.txid === outputTxid && contract.contract === selected.contractId;
          if (!linked) continue;
          let units = null;
          try { units = amountUnits(contract.amount, provider.nexusDecimals); } catch { /* invalid */ }
          if (contractAddress(contract.from) !== provider.nexusToken
              || contractAddress(contract.to) !== job.nexusAccount
              || contract.token !== provider.nexusToken
              || units !== expectedUnits
              || wireReference(contract.reference) !== selected.reference) {
            linkedMismatch = true;
            continue;
          }
          if (!Number.isInteger(contract.id) || contract.id < 0) {
            return { verified: false, reason: 'invalid_claim_evidence' };
          }
          if (claimTx.confirmations < requiredFinality(job)) {
            return { verified: false, reason: 'claim_insufficient_finality' };
          }
          claims.push({
            txid: claimTx.txid, contractId: contract.id, operation: 'CREDIT',
            linkedDebitTxid: outputTxid, linkedDebitContract: selected.contractId,
            from: provider.nexusToken, to: job.nexusAccount, token: provider.nexusToken,
            amount: String(contract.amount), reference: selected.reference,
            confirmations: claimTx.confirmations,
          });
        }
      }
      if (claims.length === 0 && linkedMismatch) {
        return { verified: false, reason: 'nexus_output_claim_mismatch' };
      }
      if (claims.length === 0) {
        return {
          verified: false, pendingClaim: true,
          reason: claimHistoryComplete ? 'nexus_output_pending_claim' : 'nexus_output_claim_history_incomplete',
          txid: outputTxid, contractId: debit.contractId,
          receipt: selected.receipt, debitEvidence: debit.evidence,
        };
      }
      if (claims.length !== 1) return { verified: false, reason: 'ambiguous_output_claim' };
      return {
        verified: true, txid: outputTxid, contractId: debit.contractId,
        receipt: selected.receipt, debitEvidence: debit.evidence, claimEvidence: claims[0],
      };
    },
  };
  return client;
}

module.exports = { createNexusClient };
