# DEX branch reconciliation — 2026-09-07

## Scope and selected code

Reconcile `master` (`f3a253c26a125ec6e51f0659f12eed83f976a184`) with
`performance/eslint-and-memo` (`9d24ee80608ce0f083447dce8f6842590a823fdf`).
Neither branch can replace the other wholesale: master has newer native-DEX
correctness fixes and Jest/CI, while the feature branch has the new swap client.

| Conflict | Resolution |
| --- | --- |
| `src/App/Main.js` | Preserve master's functional input updates and ref-backed polling; retain the visible cross-chain tab and tracked ErrorBoundary relocation. |
| `src/App/stablecoinSwap.js` | The provider-aware replacement supersedes the dormant legacy prototype. Preserve cancellation and invalidate the exact effect generation during cleanup. |
| `src/configureStore.js` | Keep the shared settings/journal writer and acknowledged financial-write gate. Retain master's memoized session selector and removal of transient order state. Do not install a parallel settings-only writer that could erase the journal. |
| `package.json` | Keep Jest as `npm test`, retain the Node suite as `test:swap`, and provide `test:all` for both. Preserve master dependencies/lockfile and strict swap lint. |
| `IMPROVEMENTS.md` | Retain master's native-DEX fixes and roadmap, preserve dated review history, and distinguish the implemented cross-chain client from release authorization. |

The existing four-file uncommitted patch was preserved and incorporated: wallet
scope rechecks after asynchronous source/debit operations, rejection of conflicting
manual mapping identities, support for internally canonical BigInt contract IDs,
the mapping read-back assertion, and the injected-runtime storage-reason guard.
Four obsolete `.backup`/`.bak`/`.original` copies are not shipped; their originals
remain recoverable from feature-branch history and the local pre-merge bundle.

Master's `src/actions`, `src/reducers`, `src/utils`, `ChartWindow.js`, and
`package-lock.json` are unchanged. The feature's journal, persistence coordinator,
and deployment-acceptance module are unchanged. `swapService` is outside scope.

## Executed verification

A clean `npm ci` succeeded. Both the untouched master baseline and the merged
candidate were exercised. Final gates were run with Node **20.19.5**, matching
CI's Node 20 major version:

```bash
npm run test:all
npm test -- --ci --coverage --runInBand
npm run lint
npm run lint:swap
npm run build
```

- **41 Jest tests passed** across five suites, including three new real
  Redux/persistence integration regressions. They prove memoized session
  selection, transient-state omission, preserved journals during legacy settings
  writes, missing-ack funding rejection, and serialization behind journal writes.
- **110 swap tests passed**, with zero failures, cancellations, or skips.
- Whole-application lint: **0 errors, 21 warnings**. A JSON comparison against
  master's 42 warnings found no new lint messages.
- Strict swap lint: **0 errors, 0 warnings**.
- Production build emitted both `app.js` and `solana-signer.js`; every file in
  `nxs_package.json` exists. Webpack retains three bundle-size/performance warnings.
- No unmerged index entries, conflict markers, or whitespace errors remain.
- A limited credential-pattern scan found no matches; this is not a comprehensive
  security audit.

CI now runs both suites, both lint gates, the production build, and manifest-file
validation. Its artifact includes the module files and both bundles rather than
only `app.js`.

The [independent final merge review](BRANCH_MERGE_REVIEW.md) passed. Its recorded
source/configuration/test hashes were independently checked against this candidate
before committing.

## Known limits and release status

`npm audit` reports **35 existing findings** (4 low, 14 moderate, 15 high,
2 critical). The full findings match untouched master, and the lockfile is
unchanged. No dependency upgrade or `npm audit fix` was performed; compatibility
with Nexus Interface remains a separate remediation gate.

**This merge does not authorize funding.** `ACCEPTED_DEPLOYMENTS` remains empty;
financial writes still require a future acknowledged-storage host capability.
Offline tests do not establish live Nexus/Solana, installation, browser-wallet,
crash-recovery, or provider acceptance. Follow
[`CROSS_CHAIN_SWAPS.md`](CROSS_CHAIN_SWAPS.md) before enabling a deployment.
