// Static, reviewed release policy. Never load acceptance or RPC URLs from an on-chain asset.
const NETWORKS = Object.freeze({
  'mainnet-beta': {rpcUrl: 'https://api.mainnet-beta.solana.com', genesis: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d'},
  devnet: {rpcUrl: 'https://api.devnet.solana.com', genesis: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'},
  testnet: {rpcUrl: 'https://api.testnet.solana.com', genesis: '4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY'},
});
// Populated only after exact-candidate Nexus Interface + service test-network acceptance.
// Each entry pins ALL keys below, directional output dust floors, and an evidence document.
const ACCEPTED_DEPLOYMENTS = Object.freeze([]);
const IDENTITY = ['address', 'owner', 'nexusToken', 'nexusTreasury', 'solanaMint', 'solanaVault'];
function assertDeploymentAccepted(job, accepted = ACCEPTED_DEPLOYMENTS) {
  const entry = accepted.find(candidate => candidate.evidence &&
    IDENTITY.every(key => candidate[key] === job.provider?.[key]) &&
    candidate.nexusNetwork === job.scope?.nexusNetwork &&
    candidate.solanaGenesis === job.scope?.solanaGenesis &&
    candidate.directions?.includes(job.direction));
  if (!entry) { throw new Error('Funding disabled: this deployment has no recorded live acceptance. Provider inspection and quotes remain available.'); }
  const floor = job.direction === 'solana-to-nexus' ? entry.dustToNexusUnits : entry.dustToSolanaUnits;
  if (!/^\d+$/.test(String(floor)) || BigInt(job.quote.outputUnits) < BigInt(floor)) {
    throw new Error('Output is below the reviewed deployment dust floor or its policy is missing.');
  }
  return entry;
}
module.exports = {NETWORKS, ACCEPTED_DEPLOYMENTS, assertDeploymentAccepted};
