'use strict';

const FUTURE_SKEW_MS = 5 * 60 * 1000;
const STALE_AFTER_MS = 10 * 60 * 1000;
const RECOMMENDED_V1 = 'nexusBridgeHeartbeat';

class ProviderError extends Error {
  constructor(code, message, details) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(raw, field) {
  if (!Object.prototype.hasOwnProperty.call(raw, field) || raw[field] === undefined || raw[field] === null) {
    throw new ProviderError('MISSING_FIELD', `recommended-v1 provider is missing required field ${field}`, { field });
  }
  const value = raw[field];
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new ProviderError('INVALID_FIELD', `recommended-v1 provider field ${field} must be a non-empty string without surrounding whitespace`, { field });
  }
  return value;
}

function requireDecimal(raw, field) {
  const value = requireString(raw, field);
  if (!/^(0|[1-9][0-9]*)(?:\.[0-9]+)?$/.test(value)) {
    throw new ProviderError('INVALID_FIELD', `recommended-v1 provider field ${field} must be a canonical non-negative plain decimal`, { field });
  }
  return value;
}

function parseBps(raw) {
  const value = requireString(raw, 'fee_bps');
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new ProviderError('INVALID_FIELD', 'recommended-v1 provider field fee_bps must be an integer', { field: 'fee_bps' });
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 10000) {
    throw new ProviderError('INVALID_FIELD', 'recommended-v1 provider field fee_bps must be from 0 through 10000', { field: 'fee_bps' });
  }
  return parsed;
}

function parseTimestamp(raw, nowMs) {
  const field = 'last_poll_timestamp';
  if (!Object.prototype.hasOwnProperty.call(raw, field)) {
    throw new ProviderError('MISSING_FIELD', `recommended-v1 provider is missing required field ${field}`, { field });
  }
  const value = raw[field];
  let seconds;
  if (typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value)) {
    seconds = Number(value);
  } else if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    seconds = value;
  } else {
    throw new ProviderError('INVALID_FIELD', `recommended-v1 provider field ${field} must be a non-negative integer timestamp`, { field });
  }
  if (!Number.isSafeInteger(seconds) || seconds > Math.floor(Number.MAX_SAFE_INTEGER / 1000)) {
    throw new ProviderError('INVALID_FIELD', `recommended-v1 provider field ${field} is outside the supported range`, { field });
  }
  const timestamp = seconds * 1000;
  if (timestamp - nowMs >= FUTURE_SKEW_MS) {
    throw new ProviderError('FUTURE_TIMESTAMP', 'provider heartbeat is too far in the future');
  }
  return timestamp;
}

function validateNow(nowMs) {
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) {
    throw new ProviderError('INVALID_NOW', 'nowMs must be a non-negative safe integer');
  }
}

function normalizeProvider(raw, nowMs = Date.now()) {
  validateNow(nowMs);
  if (!plainObject(raw)) {
    throw new ProviderError('INVALID_PROVIDER', 'provider candidate must be an object');
  }
  if (raw.schema !== undefined || raw.schema_version !== undefined) {
    throw new ProviderError('UNSUPPORTED_SCHEMA', 'Explicit provider schema is not the reviewed unversioned recommended-v1 record');
  }
  if (raw.distordiaType !== RECOMMENDED_V1) {
    const marker = raw.distordiaType === undefined ? raw['distordia-type'] : raw.distordiaType;
    throw new ProviderError(
      'UNSUPPORTED_SCHEMA',
      `unsupported provider schema${marker === undefined ? '' : `: ${String(marker)}`}; only recommended-v1 ${RECOMMENDED_V1} is executable`
    );
  }

  return {
    schema: 'recommended-v1',
    ...(raw.receipt_schema === undefined ? {} : {receiptSchema: requireString(raw, 'receipt_schema')}),
    address: requireString(raw, 'address'),
    owner: requireString(raw, 'owner'),
    name: requireString(raw, 'provider'),
    nexusToken: requireString(raw, 'nexus_token_register_address'),
    nexusTreasury: requireString(raw, 'nexus_treasury_address'),
    nexusSymbol: requireString(raw, 'nexus_token'),
    solanaMint: requireString(raw, 'solana_vault_mint'),
    solanaVault: requireString(raw, 'solana_vault_address'),
    solanaSymbol: requireString(raw, 'solana_token'),
    memoPrefix: requireString(raw, 'memo_prefix'),
    feeBps: parseBps(raw),
    feeFlatToNexus: requireDecimal(raw, 'fee_flat_to_nexus'),
    feeFlatToSolana: requireDecimal(raw, 'fee_flat_to_solana'),
    minToNexus: requireDecimal(raw, 'min_to_nexus'),
    minToSolana: requireDecimal(raw, 'min_to_solana'),
    timestamp: parseTimestamp(raw, nowMs),
    status: requireString(raw, 'status'),
  };
}

const ENRICHMENT_FIELDS = new Set([
  'nexusDecimals',
  'solanaDecimals',
  'solanaVaultOwner',
  'solanaGenesis',
  'nexusNetwork',
]);

function enrichProvider(provider, enrichment) {
  if (!plainObject(provider) || provider.schema !== 'recommended-v1') {
    throw new ProviderError('INVALID_PROVIDER', 'only a normalized recommended-v1 provider can be enriched');
  }
  if (!plainObject(enrichment)) {
    throw new ProviderError('INVALID_ENRICHMENT', 'provider enrichment must be an object');
  }
  const result = { ...provider };
  for (const [key, value] of Object.entries(enrichment)) {
    if (!ENRICHMENT_FIELDS.has(key)) {
      throw new ProviderError('INVALID_ENRICHMENT', `unknown provider enrichment field ${key}`);
    }
    if (key === 'nexusDecimals' || key === 'solanaDecimals') {
      if (!Number.isInteger(value) || value < 0 || value > 255) {
        throw new ProviderError('INVALID_ENRICHMENT', `${key} must be an integer from 0 through 255`);
      }
    } else if (typeof value !== 'string' || !value || value.trim() !== value) {
      throw new ProviderError('INVALID_ENRICHMENT', `${key} must be a non-empty string without surrounding whitespace`);
    }
    result[key] = value;
  }
  return result;
}

function assertProviderReady(provider, nowMs = Date.now()) {
  validateNow(nowMs);
  if (!plainObject(provider) || provider.schema !== 'recommended-v1') {
    throw new ProviderError('INVALID_PROVIDER', 'provider is not normalized recommended-v1');
  }
  const missing = [...ENRICHMENT_FIELDS].filter((field) => provider[field] === undefined);
  if (missing.length) {
    throw new ProviderError('MISSING_ENRICHMENT', `provider is inspect-only until chain validation supplies: ${missing.join(', ')}`, { fields: missing });
  }
  // Reuse enrichment validation to reject corrupted cached values.
  enrichProvider(provider, Object.fromEntries([...ENRICHMENT_FIELDS].map((field) => [field, provider[field]])));
  if (provider.status !== 'online') {
    throw new ProviderError('PROVIDER_NOT_ONLINE', `provider status is ${String(provider.status)}`);
  }
  if (!Number.isSafeInteger(provider.timestamp) || provider.timestamp < 0) {
    throw new ProviderError('INVALID_TIMESTAMP', 'provider timestamp must be a non-negative safe integer in milliseconds');
  }
  if (provider.timestamp - nowMs >= FUTURE_SKEW_MS) {
    throw new ProviderError('FUTURE_TIMESTAMP', 'provider heartbeat is too far in the future');
  }
  if (nowMs - provider.timestamp >= STALE_AFTER_MS) {
    throw new ProviderError('STALE_PROVIDER', 'provider heartbeat is stale');
  }
  return true;
}

const TERM_FIELDS = [
  'schema', 'receiptSchema', 'address', 'owner', 'nexusToken', 'nexusTreasury', 'nexusSymbol',
  'solanaMint', 'solanaVault', 'solanaSymbol', 'memoPrefix', 'feeBps',
  'feeFlatToNexus', 'feeFlatToSolana', 'minToNexus', 'minToSolana',
  'nexusDecimals', 'solanaDecimals', 'solanaVaultOwner', 'solanaGenesis', 'nexusNetwork',
];

function sameProviderTerms(a, b) {
  if (!plainObject(a) || !plainObject(b)) return false;
  if (a.schema !== 'recommended-v1' || b.schema !== 'recommended-v1' || !a.address || !b.address) return false;
  return TERM_FIELDS.every((field) => a[field] === b[field]);
}

function discoveryResult(providers, rejected, complete, error) {
  return { providers, rejected, complete, error };
}

async function discoverProviders(apiCall, options = {}) {
  if (typeof apiCall !== 'function') {
    throw new ProviderError('INVALID_API', 'apiCall must be a function');
  }
  const { pageSize = 100, maxPages = 20, nowMs = Date.now() } = options;
  validateNow(nowMs);
  if (!Number.isInteger(pageSize) || pageSize <= 0 || !Number.isInteger(maxPages) || maxPages <= 0) {
    throw new ProviderError('INVALID_DISCOVERY_OPTIONS', 'pageSize and maxPages must be positive integers');
  }

  const byAddress = new Map();
  const conflicted = new Set();
  const rejected = [];

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    let page;
    try {
      page = await apiCall('register/list/assets:asset', {
        limit: pageSize,
        offset: pageIndex * pageSize,
      });
    } catch (cause) {
      const error = new ProviderError('DISCOVERY_FAILED', `provider discovery failed at page ${pageIndex + 1}: ${cause && cause.message ? cause.message : String(cause)}`);
      return discoveryResult([...byAddress.values()], rejected, false, error);
    }
    if (!Array.isArray(page)) {
      const error = new ProviderError('INVALID_DISCOVERY_PAGE', `provider discovery page ${pageIndex + 1} was not an array`);
      return discoveryResult([...byAddress.values()], rejected, false, error);
    }
    if (page.length > pageSize) {
      const error = new ProviderError('INVALID_DISCOVERY_PAGE', `provider discovery page ${pageIndex + 1} exceeded requested page size`);
      return discoveryResult([...byAddress.values()], rejected, false, error);
    }

    for (const raw of page) {
      if (plainObject(raw) && raw.distordiaType === undefined && raw['distordia-type'] === undefined) continue;
      let normalized;
      try {
        normalized = normalizeProvider(raw, nowMs);
      } catch (error) {
        rejected.push({ raw, error });
        continue;
      }
      const address = normalized.address;
      if (conflicted.has(address)) continue;
      const previous = byAddress.get(address);
      if (previous) {
        if (JSON.stringify(previous) !== JSON.stringify(normalized)) {
          byAddress.delete(address);
          conflicted.add(address);
        }
      } else {
        byAddress.set(address, normalized);
      }
    }

    if (conflicted.size) {
      const addresses = [...conflicted];
      const error = new ProviderError('DUPLICATE_PROVIDER_CONFLICT', `conflicting records found for provider address(es): ${addresses.join(', ')}`, { addresses });
      return discoveryResult([...byAddress.values()], rejected, false, error);
    }
    if (page.length < pageSize) {
      return discoveryResult([...byAddress.values()], rejected, true, null);
    }
  }

  const error = new ProviderError('DISCOVERY_INCOMPLETE', `provider discovery reached the ${maxPages}-page cap before proving completion`);
  return discoveryResult([...byAddress.values()], rejected, false, error);
}

async function rereadProvider(apiCall, address, options = {}) {
  if (typeof apiCall !== 'function') throw new ProviderError('INVALID_API', 'apiCall must be a function');
  if (typeof address !== 'string' || !address || address.trim() !== address) {
    throw new ProviderError('INVALID_ADDRESS', 'provider address must be a non-empty string without surrounding whitespace');
  }
  let raw;
  try {
    raw = await apiCall('register/get/assets:asset', { address });
  } catch (cause) {
    throw new ProviderError('PROVIDER_READ_FAILED', `address-bound provider read failed: ${cause && cause.message ? cause.message : String(cause)}`);
  }
  const provider = normalizeProvider(raw, options.nowMs === undefined ? Date.now() : options.nowMs);
  if (provider.address !== address) {
    throw new ProviderError('ADDRESS_MISMATCH', `address-bound provider read returned ${provider.address} instead of ${address}`);
  }
  return provider;
}

module.exports = {
  ProviderError,
  normalizeProvider,
  enrichProvider,
  assertProviderReady,
  sameProviderTerms,
  discoverProviders,
  rereadProvider,
};
