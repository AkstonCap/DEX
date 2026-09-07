import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useSelector} from 'react-redux';
import styled from '@emotion/styled';
import {apiCall, secureApiCall, openInBrowser, copyToClipboard} from 'nexus-module';
import {createRuntime, makeSigningUrl} from '../swap/runtime';
import {getPersistence} from '../swap/persistence';

const Surface = styled.section`
  text-align: left; padding: 20px 4px; color: inherit;
  --swap-line: rgba(128,128,128,.3); --swap-accent: #cb7a15;
  h2 { margin: 0 0 8px; font-size: 1.5rem; }
  h3 { margin: 0 0 14px; font-size: 1.1rem; }
  p { line-height: 1.5; }
  .muted { opacity: .72; font-size: .9rem; }
  .notice { padding: 12px 16px; border-left: 3px solid var(--swap-accent); background: rgba(203,122,21,.09); overflow-wrap: anywhere; }
  .layout { display: grid; grid-template-columns: minmax(230px, 1fr) minmax(330px, 2fr); gap: 24px; margin-top: 24px; }
  .directory, .workspace, .job { border: 1px solid var(--swap-line); padding: 18px; border-radius: 8px; min-width: 0; }
  .directory { align-self: start; }
  .provider { width: 100%; text-align: left; padding: 12px; margin: 8px 0; display: block; }
  .provider[aria-pressed=true] { border-color: var(--swap-accent); box-shadow: inset 3px 0 var(--swap-accent); }
  .provider strong, .provider small { display: block; margin-bottom: 5px; }
  label { display: block; font-size: .9rem; margin: 14px 0 6px; }
  input, select { box-sizing: border-box; width: 100%; padding: 10px; color: inherit; background: transparent; border: 1px solid var(--swap-line); border-radius: 5px; font: inherit; }
  select option { color: #20252a; background: #fff; }
  button { color: inherit; background: transparent; border: 1px solid var(--swap-line); border-radius: 5px; padding: 9px 13px; cursor: pointer; font: inherit; }
  button:disabled { opacity: .5; cursor: not-allowed; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--swap-accent); outline-offset: 3px; }
  .primary { border-color: var(--swap-accent); background: rgba(203,122,21,.14); font-weight: 600; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .receipt { display: grid; grid-template-columns: 1fr 28px 1fr; gap: 10px; padding: 18px 0; border-top: 1px solid var(--swap-line); border-bottom: 1px solid var(--swap-line); margin: 18px 0; }
  .receipt .arrow { align-self: center; color: var(--swap-accent); font-size: 1.4rem; }
  .amount { display: block; font-size: 1.35rem; font-weight: 650; margin: 5px 0; overflow-wrap: anywhere; }
  code { font-size: .78rem; overflow-wrap: anywhere; white-space: normal; }
  .jobs { margin-top: 28px; }
  .job { margin: 12px 0; }
  .state { padding: 4px 8px; border: 1px solid var(--swap-line); border-radius: 4px; font-size: .85rem; }
  .job details { margin: 12px 0; }
  .job pre { max-height: 280px; overflow: auto; font-size: .8rem; white-space: pre-wrap; overflow-wrap: anywhere; }
  .job input { flex: 1; min-width: 180px; }
  @media (max-width: 760px) { .layout { grid-template-columns: 1fr; } }
`;
const LABELS = {
  draft:'Reviewed · not funded', awaiting_signature:'Awaiting Solana signature',
  submission_unknown:'Submission uncertain · do not resend', debit_submitted:'Nexus debit submitted',
  awaiting_service_credit:'Awaiting provider credit', mapping_unknown:'Routing publication needs recovery',
  awaiting_payout:'Awaiting verified payout', completed:'Completed · evidence verified', cancelled:'Cancelled before funding',
};

export default function StablecoinSwap({runtimeOverride}) {
  const wallet = useSelector(state => state.nexus);
  const walletIdentity = JSON.stringify([wallet?.userStatus, wallet?.coreInfo]);
  const [cluster, setCluster] = useState('mainnet-beta');
  const runtime = useMemo(() => runtimeOverride || createRuntime({apiCall, secureApiCall,
    persistence: getPersistence(), locks: navigator.locks, cluster}), [runtimeOverride, cluster]);
  const [discovery, setDiscovery] = useState(null);
  const [context, setContext] = useState(null);
  const [selected, setSelected] = useState(null);
  const [address, setAddress] = useState('');
  const [direction, setDirection] = useState('solana-to-nexus');
  const [amount, setAmount] = useState('');
  const [nexusAccount, setNexusAccount] = useState('');
  const [solanaAccount, setSolanaAccount] = useState('');
  const [consent, setConsent] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [ids, setIds] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const mounted = useRef(true);
  const working = useRef(false);
  const generation = useRef(0);
  const scopeRef = useRef(context);
  scopeRef.current = context;

  const reloadJobs = useCallback(() => {
    if (scopeRef.current && mounted.current) {
      setJobs(runtime.controller.list(scopeRef.current));
    }
  }, [runtime]);
  const run = useCallback(async work => {
    if (working.current) { return; }
    working.current = true; setBusy(true); setError('');
    const current = generation.current;
    try { await work(); }
    catch (failure) { if (mounted.current && current === generation.current) { setError(failure.message); } }
    finally {
      working.current = false;
      if (mounted.current && current === generation.current) {
        setBusy(false);
        try { reloadJobs(); } catch (failure) { setError(failure.message); }
      }
    }
  }, [reloadJobs]);

  useEffect(() => {
    mounted.current = true;
    const current = ++generation.current;
    setSelected(null); setContext(null); setJobs([]); setConsent(false); setError('');
    setBusy(true);
    Promise.allSettled([runtime.discover(), runtime.scope()]).then(([found, scope]) => {
      if (!mounted.current || generation.current !== current) { return; }
      if (found.status === 'fulfilled') { setDiscovery(found.value); }
      else { setDiscovery(null); setError(found.reason.message); }
      if (scope.status === 'fulfilled') {
        setContext(scope.value);
        try { setJobs(runtime.controller.list(scope.value)); } catch (failure) { setError(failure.message); }
      } else { setError(scope.reason.message); }
      setBusy(false);
    });
    return () => {
      mounted.current = false;
      generation.current = current + 1;
    };
  }, [runtime, walletIdentity]);

  useEffect(() => {
    let cancelled = false, timer;
    async function observe() {
      if (!cancelled && !working.current && context) {
        try {
          for (const job of runtime.controller.list(context)) {
            if (cancelled) { break; }
            if (['debit_submitted','awaiting_service_credit'].includes(job.state)) {
              await runtime.controller.inspect(job.id);
            }
          }
          if (!cancelled) { reloadJobs(); }
        } catch (failure) { if (!cancelled) { setNotice(`Observation paused: ${failure.message}`); } }
      }
      if (!cancelled) { timer = setTimeout(observe, 15000); }
    }
    timer = setTimeout(observe, 15000);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [runtime, context, reloadJobs]);

  const choose = async providerAddress => {
    const current = generation.current;
    const result = await runtime.select(providerAddress);
    if (current !== generation.current || !mounted.current) { return; }
    setSelected(result); setContext(result.scope); setNexusAccount(result.accounts[0]?.address || '');
    setSolanaAccount(''); setAmount(''); setConsent(false); setNotice('');
  };
  const quoted = useMemo(() => {
    if (!selected || !amount) { return {value:null,error:''}; }
    try { return {value:runtime.quote(selected.provider,direction,amount),error:''}; }
    catch (failure) { return {value:null,error:failure.message}; }
  }, [selected, direction, amount, runtime]);
  const proposal = selected && quoted.value ? {scope:selected.scope, direction, provider:selected.provider,
    quote:quoted.value, nexusAccount, solanaAccount, nexusMinConfirmations:6,
    expiresAt:Date.now()+15*60*1000} : null;
  const reason = proposal ? runtime.fundingReason(proposal) : '';
  const storageReason = typeof runtime.storageReason === 'function' ? runtime.storageReason() : '';
  const fromSymbol = selected && (direction === 'solana-to-nexus' ? selected.provider.solanaSymbol : selected.provider.nexusSymbol);
  const toSymbol = selected && (direction === 'solana-to-nexus' ? selected.provider.nexusSymbol : selected.provider.solanaSymbol);
  const changeId = (key,value) => setIds(previous => ({...previous,[key]:value}));
  const exportJob = job => {
    const blob = new Blob([JSON.stringify(job,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href=url; a.download=`swap-${job.id}.json`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  return <Surface aria-label="Cross-chain swaps">
    <h2>Cross-chain swaps</h2>
    <p className="muted">Discover providers on Nexus. Review the exact pair, custody accounts and fees before funding.</p>
    <p className="notice">Providers hold the swap funds. An on-chain listing or fresh heartbeat is not an endorsement or a solvency guarantee. This is not an atomic swap.</p>
    {error && <p role="alert" className="notice">{error}</p>}
    {notice && <p role="status" className="muted">{notice}</p>}
    {busy && <p role="status">Reading or verifying…</p>}
    <div className="layout">
      <aside className="directory">
        <h3>Provider directory</h3>
        <label htmlFor="swap-network">Solana network</label>
        <select id="swap-network" value={cluster} disabled={busy} onChange={event=>setCluster(event.target.value)}>
          <option value="mainnet-beta">Mainnet beta</option><option value="devnet">Devnet</option><option value="testnet">Testnet</option>
        </select>
        <p className="muted">Nexus network: {context?.nexusNetwork || 'read from your wallet'}. Network identity is checked again before funding.</p>
        <button disabled={busy} onClick={()=>run(async()=>{setDiscovery(await runtime.discover());setSelected(null);})}>Refresh providers</button>
        {discovery && <p className="muted">{discovery.providers.length} matching records · {discovery.complete ? 'scan finished' : 'incomplete scan'}</p>}
        {discovery?.error && <p role="alert">{discovery.error.message}</p>}
        {discovery?.providers.map(provider=><button key={provider.address} className="provider" disabled={busy}
          aria-pressed={selected?.provider.address===provider.address} onClick={()=>run(()=>choose(provider.address))}>
          <strong>{provider.name}</strong><small>{provider.solanaSymbol} ↔ {provider.nexusSymbol} · reported {provider.status}</small>
          <code>{provider.address}</code>
        </button>)}
        {discovery?.providers.length===0 && <p>No supported providers found in this scan. Retry or inspect a known register address below.</p>}
        {!!discovery?.rejected.length && <details><summary>Unsupported or malformed records ({discovery.rejected.length})</summary>
          {discovery.rejected.slice(0,10).map((item,index)=><p key={index} className="muted">{item.error.message}</p>)}</details>}
        <label htmlFor="provider-address">Provider register address</label>
        <input id="provider-address" value={address} onChange={event=>setAddress(event.target.value)} autoComplete="off" />
        <button disabled={busy || !address} onClick={()=>run(()=>choose(address))}>Inspect address</button>
      </aside>
      <div className="workspace">
        {!selected ? <><h3>Select a provider</h3><p>DEX reads the record by its register address, then checks the actual token and custody accounts on both networks.</p>
          <p className="muted">No default USDC/USDD pair or destination is substituted when a provider is incomplete.</p>
          <h3>Use your existing Solana wallet</h3><p>The browser signing companion builds the transfer and memo together. Phantom or Solflare signs it; DEX never asks for a seed phrase or private key.</p></> : <>
          <h3>{selected.provider.name}</h3>
          <p className="muted">Operator genesis: <code>{selected.provider.owner}</code></p>
          <label htmlFor="swap-direction">Direction</label>
          <select id="swap-direction" value={direction} disabled={busy} onChange={event=>{setDirection(event.target.value);setConsent(false);}}>
            <option value="solana-to-nexus">{selected.provider.solanaSymbol} on Solana → {selected.provider.nexusSymbol} on Nexus</option>
            <option value="nexus-to-solana">{selected.provider.nexusSymbol} on Nexus → {selected.provider.solanaSymbol} on Solana</option>
          </select>
          <label htmlFor="swap-amount">Amount to send ({fromSymbol})</label>
          <input id="swap-amount" inputMode="decimal" value={amount} disabled={busy} onChange={event=>{setAmount(event.target.value);setConsent(false);}} placeholder="0" />
          <label htmlFor="swap-nexus-account">Your Nexus {selected.provider.nexusSymbol} account</label>
          <select id="swap-nexus-account" value={nexusAccount} disabled={busy} onChange={event=>{setNexusAccount(event.target.value);setConsent(false);}}>
            {!selected.accounts.length && <option value="">No matching owned account</option>}
            {selected.accounts.map(account=><option key={account.address} value={account.address}>{account.name || account.address}</option>)}
          </select>
          {direction==='nexus-to-solana' && <><label htmlFor="swap-solana-account">Destination SPL token account (not a wallet owner address)</label>
            <input id="swap-solana-account" value={solanaAccount} disabled={busy} onChange={event=>{setSolanaAccount(event.target.value);setConsent(false);}} autoComplete="off" />
            <p className="muted">Must be an existing, unfrozen account for the provider’s mint.</p></>}
          {quoted.error && <p role="alert">{quoted.error}</p>}
          {quoted.value && <div className="receipt">
            <div><small>You send</small><span className="amount">{quoted.value.inputAmount} {fromSymbol}</span><code>{quoted.value.inputUnits} base units</code></div>
            <span className="arrow" aria-hidden="true">→</span>
            <div><small>Expected after fees</small><span className="amount">{quoted.value.outputAmount} {toSymbol}</span><code>{quoted.value.outputUnits} base units</code></div>
          </div>}
          <details><summary>Token identities, custody and terms</summary>
            <p>Nexus token: <code>{selected.provider.nexusToken}</code></p><p>Nexus treasury: <code>{selected.provider.nexusTreasury}</code></p>
            <p>Solana mint: <code>{selected.provider.solanaMint}</code></p><p>Solana vault: <code>{selected.provider.solanaVault}</code></p>
            <p>Flat fee to Nexus: {selected.provider.feeFlatToNexus} {selected.provider.nexusSymbol}; to Solana: {selected.provider.feeFlatToSolana} {selected.provider.solanaSymbol}. Variable fee: {selected.provider.feeBps} basis points.</p>
            <p>Minimum input to Nexus: {selected.provider.minToNexus} {selected.provider.solanaSymbol}; to Solana: {selected.provider.minToSolana} {selected.provider.nexusSymbol}.</p>
            <p>Payout receipts: {selected.provider.receiptSchema || 'not advertised'}. A local quote snapshot is not a provider guarantee.</p>
            <p>Nexus finality: 6 confirmations. This reviewed minimum is frozen with the job and cannot be lowered.</p>
          </details>
          {direction==='solana-to-nexus' && <p className="notice">Do not use an ordinary wallet Send without a memo. The signing companion adds <code>{selected.provider.memoPrefix}{nexusAccount}</code> to the transaction automatically.</p>}
          <label><input style={{width:'auto',marginRight:8}} type="checkbox" checked={consent} disabled={busy} onChange={event=>setConsent(event.target.checked)} />I reviewed the provider, addresses and custodial risk.</label>
          <button className="primary" disabled={busy || !!storageReason || !proposal || !nexusAccount || !consent || (direction==='nexus-to-solana' && !solanaAccount)}
            onClick={()=>run(async()=>{await runtime.controller.createJob(proposal);setNotice('Reviewed swap saved. No funds have been sent.');setConsent(false);})}>Save reviewed swap</button>
          {reason && <p className="notice">{reason}</p>}
          {storageReason && <p className="notice">{storageReason}</p>}
        </>}
      </div>
    </div>
    <section className="jobs" aria-label="Swap history">
      <h3>Swap activity</h3><p className="muted">Jobs are scoped to your wallet and both networks. A timeout never means refunded. Do not resend an uncertain transfer.</p>
      {!jobs.length && <p className="muted">No saved swaps for this wallet/network context.</p>}
      {jobs.map(job=><article className="job" key={job.id}>
        <div className="row"><strong>{job.provider.name} · {job.quote.inputAmount} → {job.quote.outputAmount}</strong><span className="state">{LABELS[job.state] || job.state}</span></div>
        <p className="muted">Job <code>{job.id}</code></p>
        {job.state==='draft' && <div className="row">
          <button className="primary" disabled={busy || !!runtime.fundingReason(job)} onClick={()=>run(async()=>{
            if(job.direction==='nexus-to-solana') { await runtime.controller.submitNexus(job.id); }
            else { const handoff=await runtime.controller.prepareSolana(job.id); openInBrowser(makeSigningUrl(handoff,window.location.href)); }
          })}>{job.direction==='solana-to-nexus' ? 'Open wallet signing page' : 'Approve Nexus debit'}</button>
          <button disabled={busy} onClick={()=>run(()=>runtime.controller.cancel(job.id))}>Cancel before funding</button>
          {runtime.fundingReason(job) && <p className="muted">{runtime.fundingReason(job)}</p>}
        </div>}
        {job.state==='awaiting_signature' && <div className="row">
          <input aria-label={`Source transaction for ${job.id}`} value={ids[`${job.id}:source`] || ''} onChange={event=>changeId(`${job.id}:source`,event.target.value)} placeholder="Paste existing source signature / debit txid" />
          <button disabled={busy || !ids[`${job.id}:source`]} onClick={()=>run(()=>runtime.controller.attachSource(job.id,ids[`${job.id}:source`]))}>Verify existing deposit</button>
        </div>}
        {job.state==='submission_unknown' && <div className="row">
          <input aria-label={`Nexus debit transaction for ${job.id}`} value={ids[`${job.id}:debit`] || ''} onChange={event=>changeId(`${job.id}:debit`,event.target.value)} placeholder="Paste exact Nexus debit transaction ID" />
          <button disabled={busy || !ids[`${job.id}:debit`]} onClick={()=>run(()=>runtime.controller.importNexusDebit(job.id,ids[`${job.id}:debit`]))}>Verify existing Nexus debit</button>
        </div>}
        {['debit_submitted','awaiting_service_credit'].includes(job.state) && !job.sourceTxid && <div className="row">
          <input aria-label={`Provider CREDIT transaction for ${job.id}`} value={ids[`${job.id}:credit`] || ''} onChange={event=>changeId(`${job.id}:credit`,event.target.value)} placeholder="Exact provider CREDIT transaction ID" />
          <input aria-label={`Provider CREDIT contract for ${job.id}`} value={ids[`${job.id}:sourceContract`] || ''} onChange={event=>changeId(`${job.id}:sourceContract`,event.target.value)} placeholder="Exact CREDIT contract ID" />
          <button disabled={busy || !ids[`${job.id}:credit`] || !ids[`${job.id}:sourceContract`]} onClick={()=>run(()=>runtime.controller.attachSource(job.id,ids[`${job.id}:credit`],ids[`${job.id}:sourceContract`]))}>Verify exact provider CREDIT</button>
        </div>}
        {['debit_submitted','awaiting_service_credit'].includes(job.state) && <button disabled={busy} onClick={()=>run(()=>runtime.controller.inspect(job.id))}>Check provider credit</button>}
        {['mapping_unknown','awaiting_service_credit'].includes(job.state) && job.sourceTxid && <button disabled={busy} onClick={()=>run(()=>runtime.controller.repairMapping(job.id))}>Publish / recover routing only</button>}
        {job.state==='mapping_unknown' && job.mappingStartedAt && (!job.mappingAddress || !job.mappingTxid) && <div className="row">
          <input aria-label={`Mapping address for ${job.id}`} value={ids[`${job.id}:mappingAddress`] || ''} onChange={event=>changeId(`${job.id}:mappingAddress`,event.target.value)} placeholder="Exact created mapping address" />
          <input aria-label={`Mapping create transaction for ${job.id}`} value={ids[`${job.id}:mappingTxid`] || ''} onChange={event=>changeId(`${job.id}:mappingTxid`,event.target.value)} placeholder="Exact mapping CREATE transaction ID" />
          <button disabled={busy || !ids[`${job.id}:mappingAddress`] || !ids[`${job.id}:mappingTxid`]} onClick={()=>run(()=>runtime.controller.recoverMapping(job.id,ids[`${job.id}:mappingAddress`],ids[`${job.id}:mappingTxid`]))}>Verify created mapping</button>
        </div>}
        {job.state==='awaiting_payout' && job.direction==='solana-to-nexus' && <div>
          <button disabled={busy} onClick={()=>run(()=>runtime.controller.complete(job.id,null))}>Check receipt / payout</button>
          {job.reason==='nexus_output_pending_claim' && <p className="notice">A source-bound payout receipt and Nexus DEBIT were found, but the spendable CREDIT is still pending. Open Receive in the Nexus wallet and follow its notifications to claim, then check again.</p>}
        </div>}
        {job.state==='awaiting_payout' && job.direction==='nexus-to-solana' && <div className="row">
          <input aria-label={`Payout transaction for ${job.id}`} value={ids[`${job.id}:payout`] || ''} onChange={event=>changeId(`${job.id}:payout`,event.target.value)} placeholder="Payout transaction ID or signature" />
          <button disabled={busy || !ids[`${job.id}:payout`]} onClick={()=>run(()=>runtime.controller.complete(job.id,ids[`${job.id}:payout`]))}>Verify payout evidence</button>
        </div>}
        {job.reason && job.reason!=='nexus_output_pending_claim' && <p className="notice">{job.reason}</p>}
        <details><summary>Frozen terms and transaction evidence</summary><pre>{JSON.stringify(job,null,2)}</pre></details>
        <div className="row"><button onClick={()=>exportJob(job)}>Export public evidence</button><button onClick={()=>copyToClipboard(job.id)}>Copy job ID</button></div>
      </article>)}
    </section>
  </Surface>;
}
