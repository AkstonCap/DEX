'use strict';

class MoneyError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'MoneyError';
    this.code = code;
  }
}

function validateDecimals(decimals) {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    throw new MoneyError('INVALID_DECIMALS', 'decimals must be an integer from 0 through 255');
  }
}

function parseUnits(text, decimals) {
  validateDecimals(decimals);
  if (typeof text !== 'string') {
    throw new MoneyError('INVALID_AMOUNT', 'amount must be a string');
  }
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(text);
  if (!match) {
    throw new MoneyError('INVALID_AMOUNT', 'amount must be a canonical non-negative plain decimal string');
  }
  const fraction = match[2] || '';
  if (fraction.length > decimals) {
    throw new MoneyError('INVALID_AMOUNT_PRECISION', `amount has more than ${decimals} decimal places`);
  }
  const scale = 10n ** BigInt(decimals);
  const fractionUnits = fraction ? BigInt(fraction.padEnd(decimals, '0')) : 0n;
  return BigInt(match[1]) * scale + fractionUnits;
}

function formatUnits(units, decimals) {
  validateDecimals(decimals);
  if (typeof units !== 'bigint') {
    throw new MoneyError('INVALID_UNITS', 'units must be a bigint');
  }
  const negative = units < 0n;
  const magnitude = negative ? -units : units;
  if (decimals === 0) return `${negative ? '-' : ''}${magnitude}`;

  const scale = 10n ** BigInt(decimals);
  const whole = magnitude / scale;
  const remainder = magnitude % scale;
  if (remainder === 0n) return `${negative ? '-' : ''}${whole}`;
  const fraction = remainder.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${whole}.${fraction}`;
}

function requireText(provider, key) {
  if (!provider || typeof provider !== 'object' || typeof provider[key] !== 'string') {
    throw new MoneyError('INCOMPLETE_PROVIDER', `provider ${key} is required`);
  }
  return provider[key];
}

function requireDecimals(provider, key) {
  if (!provider || typeof provider !== 'object' || !Number.isInteger(provider[key])) {
    throw new MoneyError('INCOMPLETE_PROVIDER', `provider ${key} is required`);
  }
  validateDecimals(provider[key]);
  return provider[key];
}

function rescaleDown(units, sourceDecimals, destinationDecimals) {
  if (sourceDecimals === destinationDecimals) return units;
  if (sourceDecimals < destinationDecimals) {
    return units * (10n ** BigInt(destinationDecimals - sourceDecimals));
  }
  return units / (10n ** BigInt(sourceDecimals - destinationDecimals));
}

function quoteSwap(provider, direction, amount) {
  if (direction !== 'solana-to-nexus' && direction !== 'nexus-to-solana') {
    throw new MoneyError('INVALID_DIRECTION', 'direction must be solana-to-nexus or nexus-to-solana');
  }

  const nexusDecimals = requireDecimals(provider, 'nexusDecimals');
  const solanaDecimals = requireDecimals(provider, 'solanaDecimals');
  if (!Number.isInteger(provider.feeBps) || provider.feeBps < 0 || provider.feeBps > 10000) {
    throw new MoneyError('INVALID_FEE_BPS', 'provider feeBps must be an integer from 0 through 10000');
  }

  const toNexus = direction === 'solana-to-nexus';
  const inputDecimals = toNexus ? solanaDecimals : nexusDecimals;
  const outputDecimals = toNexus ? nexusDecimals : solanaDecimals;
  const flatFeeText = requireText(provider, toNexus ? 'feeFlatToNexus' : 'feeFlatToSolana');
  const minimumText = requireText(provider, toNexus ? 'minToNexus' : 'minToSolana');

  const inputUnits = parseUnits(amount, inputDecimals);
  if (inputUnits <= 0n) {
    throw new MoneyError('NONPOSITIVE_INPUT', 'swap input must be greater than zero');
  }
  const minimumUnits = parseUnits(minimumText, inputDecimals);
  if (inputUnits < minimumUnits) {
    throw new MoneyError('BELOW_MINIMUM', `swap input is below the ${minimumText} minimum`);
  }

  const grossOutputUnits = rescaleDown(inputUnits, inputDecimals, outputDecimals);
  if (grossOutputUnits <= 0n) {
    throw new MoneyError('DUST_OUTPUT', 'swap input is too small to represent in output units');
  }
  const flatFeeUnits = parseUnits(flatFeeText, outputDecimals);
  const bpsFeeUnits = grossOutputUnits * BigInt(provider.feeBps) / 10000n;
  const feeUnits = flatFeeUnits + bpsFeeUnits;
  const outputUnits = grossOutputUnits - feeUnits;
  if (outputUnits <= 0n) {
    throw new MoneyError('FEE_ONLY', 'swap fees consume the entire representable output');
  }

  return {
    direction,
    inputUnits: inputUnits.toString(),
    grossOutputUnits: grossOutputUnits.toString(),
    flatFeeUnits: flatFeeUnits.toString(),
    bpsFeeUnits: bpsFeeUnits.toString(),
    feeUnits: feeUnits.toString(),
    outputUnits: outputUnits.toString(),
    inputAmount: formatUnits(inputUnits, inputDecimals),
    outputAmount: formatUnits(outputUnits, outputDecimals),
    feeAmount: formatUnits(feeUnits, outputDecimals),
  };
}

module.exports = {
  MoneyError,
  parseUnits,
  formatUnits,
  quoteSwap,
};
