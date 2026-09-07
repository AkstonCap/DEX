const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const file = require('node:path').resolve(__dirname, '../../src/swap/runtime.js');
const api = fs.existsSync(file) ? require(file) : {};
test('browser handoff is same-origin, public-only, and preserves exact units', () => {
  assert.equal(typeof api.makeSigningUrl, 'function');
  const job = {id:'job-1', scope:{genesis:'g',nexusNetwork:'testnet',solanaGenesis:'s'}, direction:'solana-to-nexus',provider:{name:'P'},quote:{inputUnits:'12345678901234567',outputUnits:'1',feeUnits:'0',inputAmount:'12345678901.234567',outputAmount:'0.000001',internal:'omit'},nexusAccount:'account',solanaAccount:'',state:'awaiting_signature', reference:'44',privateKey:'must-not-leak'};
  const url = new URL(api.makeSigningUrl(job, 'http://localhost:1234/module/dex/dist/index.html'));
  assert.equal(url.origin, 'http://localhost:1234');
  assert.equal(url.pathname, '/module/dex/dist/solana-sign.html');
  const payload = JSON.parse(Buffer.from(new URLSearchParams(url.hash.slice(1)).get('job'),'base64url').toString());
  assert.equal(payload.privateKey, undefined);
  assert.equal(payload.quote.internal, undefined);
  assert.equal(payload.quote.inputUnits, '12345678901234567');
  assert.equal(payload.scope.genesis,'g');
  assert.equal(payload.reference, '44');
  assert.throws(() => api.makeSigningUrl(job,'https://user:password@example.test/index.html'), /credentials/);
});

test('runtime validates address-bound provider and enriches the configured token pair', async () => {
  assert.equal(typeof api.createRuntime, 'function');
  const raw = {distordiaType:'nexusBridgeHeartbeat',address:'provider',owner:'owner',provider:'Fixture',nexus_token_register_address:'token',nexus_treasury_address:'treasury',nexus_token:'NEX',solana_vault_mint:'mint',solana_vault_address:'vault',solana_token:'SPL',memo_prefix:'nexus:',fee_bps:'10',fee_flat_to_nexus:'0.1',fee_flat_to_solana:'0.5',min_to_nexus:'0.2',min_to_solana:'1',last_poll_timestamp:Math.floor(Date.now()/1000),status:'online'};
  const runtime = api.createRuntime({cluster:'devnet',apiCall:async (method, params) => {
    assert.equal(method,'register/get/assets:asset'); assert.equal(params.address,'provider'); return raw;
  },adapters:{
    nexus:{loadContext:async()=>({genesis:'user',nexusNetwork:'testnet'}),loadPair:async p=>({...p,nexusDecimals:6}),listAccounts:async()=>[{address:'user-account'}]},
    solana:{loadPair:async p=>({...p,solanaDecimals:8,solanaVaultOwner:'vault-owner'})},
  }});
  const selected=await runtime.select('provider');
  assert.equal(selected.provider.solanaDecimals,8);
  assert.equal(selected.scope.genesis,'user');
  assert.equal(selected.accounts[0].address,'user-account');
  assert.equal(runtime.quote(selected.provider,'nexus-to-solana','1').outputUnits,'49900000');
  raw.address='wrong';
  await assert.rejects(()=>runtime.select('provider'),/instead of provider/);
});

test('runtime exposes missing acknowledged persistence as a read-only reason without blocking reads', () => {
  const runtime = api.createRuntime({cluster:'devnet', apiCall:async()=>[], adapters:{
    nexus:{loadContext:async()=>({genesis:'g',nexusNetwork:'n'}),loadPair:async p=>p,listAccounts:async()=>[]},
    solana:{loadPair:async p=>p},
  }});
  assert.match(runtime.storageReason(), /acknowledged|storage/i);
  assert.doesNotThrow(()=>runtime.fundingReason({provider:{address:'x'},scope:{}}));
});
