/**
 * Shared normalization for market data returned by the Nexus core.
 *
 * Two rules apply to every order and every executed trade the `market/*`
 * endpoints return. Getting either wrong silently mis-prices the UI rather than
 * throwing, so both are applied in exactly one place.
 *
 * 1. NXS amounts are always returned in divisible units (actual amount * 1e6).
 *    This applies to NXS only, never to other tokens.
 * 2. The `price` field the core returns is unreliable (known core bug), so the
 *    price must be recomputed from the two amounts after conversion.
 *
 * The amount convention, which is the same for orders and for executed trades:
 *
 *   bid   contract = quote token paid      order = base token received
 *         price = contract.amount / order.amount
 *
 *   ask   contract = base token sold       order = quote token received
 *         price = order.amount / contract.amount
 *
 * The resulting `price` is always quote per base, whichever side it came from.
 */

export const NXS_DIVISIBLE_UNIT = 1e6;

const normalizeLeg = (leg) => {
  if (!leg || typeof leg !== 'object') return leg;

  const amount = parseFloat(leg.amount);
  if (!Number.isFinite(amount)) return { ...leg };

  return {
    ...leg,
    amount: leg.ticker === 'NXS' ? amount / NXS_DIVISIBLE_UNIT : amount,
  };
};

/**
 * Convert one order/trade to real units and recompute its price.
 * Returns a new object; the input is never mutated.
 *
 * @param {object} entry - order or executed trade from a market/* endpoint
 * @returns {object} normalized copy
 */
export const normalizeMarketEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return entry;

  const contract = normalizeLeg(entry.contract);
  const order = normalizeLeg(entry.order);
  const normalized = { ...entry, contract, order };

  const contractAmount = contract?.amount;
  const orderAmount = order?.amount;

  if (entry.type === 'bid' && orderAmount > 0) {
    normalized.price = contractAmount / orderAmount;
  } else if (entry.type === 'ask' && contractAmount > 0) {
    normalized.price = orderAmount / contractAmount;
  } else {
    // Not enough information to price it; surface that rather than passing the
    // core's unreliable value through.
    normalized.price = 0;
  }

  return normalized;
};

/**
 * Normalize a list of orders/trades, tolerating a missing or non-array input -
 * the market endpoints omit a side entirely when it is empty.
 *
 * @param {Array|undefined} entries
 * @returns {Array} normalized copies, always an array
 */
export const normalizeMarketEntries = (entries) =>
  Array.isArray(entries) ? entries.map(normalizeMarketEntry) : [];

/**
 * Normalize the `{ bids, asks }` envelope both market/list/order and
 * market/executed return.
 *
 * @param {object|undefined} data
 * @returns {{bids: Array, asks: Array}}
 */
export const normalizeMarketSides = (data) => ({
  bids: normalizeMarketEntries(data?.bids),
  asks: normalizeMarketEntries(data?.asks),
});
