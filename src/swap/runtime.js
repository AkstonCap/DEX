const {Buffer} = require('buffer');
const PUBLIC_PROVIDER_FIELDS = ['schema','address','owner','name','nexusToken','nexusTreasury','nexusSymbol','solanaMint','solanaVault','solanaSymbol','memoPrefix','feeBps','feeFlatToNexus','feeFlatToSolana','minToNexus','minToSolana','timestamp','status','nexusDecimals','solanaDecimals','solanaVaultOwner','solanaGenesis','nexusNetwork','verifiedVault','receiptSchema'];
const pick = (value, fields) => Object.fromEntries(fields.filter(key => value?.[key] !== undefined).map(key => [key, value[key]]));
function makeSigningUrl(job, currentLocation) {
  const url = new URL('solana-sign.html', currentLocation);
  if (url.username || url.password) { throw new Error('Signing URL credentials are forbidden.'); }
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) {
    throw new Error('Signing companion requires HTTPS or localhost.');
  }
  const publicJob = {
    ...pick(job, ['id','reference','direction','nexusAccount','solanaAccount','state','sourceTxid','sourceContract','payoutTxid','mappingAddress','createdAt','updatedAt','expiresAt']),
    scope: pick(job.scope,['genesis','nexusNetwork','solanaGenesis']),
    provider: pick(job.provider,PUBLIC_PROVIDER_FIELDS),
    quote: pick(job.quote,['inputUnits','outputUnits','feeUnits','inputAmount','outputAmount']),
  };
  const encoded = Buffer.from(JSON.stringify(publicJob),'utf8').toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  url.hash = `job=${encoded}`;
  return url.toString();
}
function createRuntime({apiCall, secureApiCall, persistence, locks, cluster = 'mainnet-beta', adapters = {}}) {
  const {NETWORKS, assertDeploymentAccepted} = require('./deployment');
  const {discoverProviders, rereadProvider, assertProviderReady, sameProviderTerms} = require('./providers');
  const {quoteSwap} = require('./money');
  const network = NETWORKS[cluster];
  if (!network) { throw new Error('Unsupported Solana network.'); }
  const read = async (method, params) => {
    const response = await apiCall(method, params);
    if (response?.error) { throw new Error(response.error.message || 'Nexus API error'); }
    return response && Object.prototype.hasOwnProperty.call(response, 'result') ? response.result : response;
  };
  const nexus = adapters.nexus || require('./nexus').createNexusClient({apiCall: read, secureApiCall});
  const solana = adapters.solana || require('./solana').createSolanaClient({rpcUrl: network.rpcUrl});
  let controller;
  const scope = async () => ({...await nexus.loadContext(), solanaGenesis: network.genesis});
  async function select(address) {
    const context = await scope();
    const raw = await rereadProvider(read, address);
    const base = {...raw, nexusNetwork: context.nexusNetwork, solanaGenesis: context.solanaGenesis};
    const pair = await solana.loadPair(await nexus.loadPair(base));
    const accounts = await nexus.listAccounts(pair, context.genesis);
    return {provider: pair, scope: context, accounts};
  }
  function quote(provider, direction, amount) {
    assertProviderReady(provider);
    return quoteSwap(provider, direction, amount);
  }
  async function validateFunding(job) {
    assertDeploymentAccepted(job);
    if (!Number.isSafeInteger(job.expiresAt) || Date.now() >= job.expiresAt) {
      throw new Error('The reviewed quote has expired. Do not fund this job.');
    }
    if (job.direction === 'solana-to-nexus' && job.provider.receiptSchema !== 'nexus-swap-receipt-v1') {
      throw new Error('Provider does not advertise source-bound Nexus payout receipts.');
    }
    const current = await select(job.provider.address);
    if (!sameProviderTerms(current.provider, job.provider)) { throw new Error('Provider identity or terms changed; review a new quote.'); }
    if (JSON.stringify(quote(current.provider, job.direction, job.quote.inputAmount)) !== JSON.stringify(job.quote)) {
      throw new Error('Frozen quote does not match the current exact terms.');
    }
    if (!current.accounts.some(account => account.address === job.nexusAccount)) {
      throw new Error('Nexus account is not owned by the active profile or has the wrong token.');
    }
    if (job.direction === 'nexus-to-solana') {
      await solana.validateTokenAccount(job.solanaAccount, job.provider.solanaMint);
      const reserve = await solana.validateTokenAccount(job.provider.solanaVault, job.provider.solanaMint, job.provider.solanaVaultOwner);
      if (BigInt(reserve.units) < BigInt(job.quote.outputUnits)) { throw new Error('Provider vault has insufficient observed liquidity.'); }
    }
  }
  return {
    cluster, network, nexus, solana, scope, select, quote,
    discover: options => discoverProviders(read, options),
    validateFunding,
    storageReason() {
      if (!persistence || typeof persistence.healthy !== 'function') {
        return 'Wallet lacks acknowledged module-storage capability; swap saving and funding are read-only.';
      }
      try { persistence.healthy(); return ''; } catch (error) { return error.message; }
    },
    fundingReason(job) {
      try { assertDeploymentAccepted(job); return ''; } catch (error) { return error.message; }
    },
    get controller() {
      if (!controller) {
        const store = require('./jobs').createJobStore({persistence, locks});
        controller = require('./controller').createSwapController({store, nexus, solana, validateFunding, loadScope: scope});
      }
      return controller;
    },
  };
}
module.exports = {makeSigningUrl, createRuntime};
