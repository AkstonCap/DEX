# DEX final merge review — PASS

## Verdict

**PASS — no concrete merge regression or blocking correctness issue found.**

No P0 critical fund-loss/skipped-deposit path, P1 money-contract/reconciliation defect, or merge-created release-gate failure was identified in the exact working tree reviewed. Previously documented live-production acceptance limitations are intentionally not repeated here.

Candidate anchors:

- master/HEAD: `f3a253c26a125ec6e51f0659f12eed83f976a184`
- feature/MERGE_HEAD: `9d24ee80608ce0f083447dce8f6842590a823fdf`
- merge base: `9e1837408c4aa7add52b76113810c19f86f142bc`
- unresolved paths: none
- `git diff --check HEAD`: pass

## Merge correctness review

### Native SDK and host boundary

- `src/configureStore.js:57-74` keeps legacy settings on the installed `nexus-module` `updateStorage` boundary while supplying the optional host `NEXUS.utilities.updateStorageAcknowledged` only to the financial journal. Absence of that future capability does not crash hydration or read-only use and causes `persistence.healthy()` to block journal-backed funding.
- An isolated probe loaded the real installed `nexus-module` (not the Jest module mock), exercised native `stateMiddleware`/`updateState` and `updateStorage`, preserved `swapJournal` during a settings write, and verified funding remained blocked without acknowledged storage.
- `src/swap/solana.js:151-367` retains real installed `@solana/web3.js`/`@solana/spl-token` construction and evidence verification. The swap suite exercises real `PublicKey`, classic-token unpacking, and `TransferChecked` serialization while replacing transport/account responses only.

### Persistence, memoization, and cancellation

- `src/configureStore.js:9-55,77-81` preserves master's source-reference memoization and removal of transient order keys while replacing the competing settings-only storage middleware with the feature journal-aware writer.
- `src/swap/persistence.js:4-46` serializes settings and journal writes through one queue; journal writes require a promise acknowledgement and preserve the latest combined blob.
- `src/App/Main.js:61-102` retains functional state updates, current-token refs, interval cleanup, and master's polling behavior.
- `src/App/stablecoinSwap.js:69-134` retains mount/generation invalidation, stale async-result suppression, observer cancellation, and timer cleanup. The saved UI compatibility fix at line 152 changes only test/runtime-override tolerance.
- Saved controller fixes are present at `src/swap/controller.js:139-144,170-178,274-283`: wallet/network scope is rechecked after external evidence/submission calls, and manual mapping recovery cannot replace an already persisted remote identity.
- Saved Nexus fix is present at `src/swap/nexus.js:162-167`; validated bigint contract IDs survive internal comparison without normalization loss. The corresponding exact mapping readback test is updated at `test/swap/nexus.test.cjs:433-470`.

### No funding enablement

- `src/swap/deployment.js:7-20` still has `ACCEPTED_DEPLOYMENTS = Object.freeze([])`.
- Both funding entry paths call `validateFunding` before handoff/write (`src/swap/controller.js:107-118,162-181`), and `src/swap/runtime.js:48-68` begins validation with `assertDeploymentAccepted`.
- The mounted UI therefore adds inspection, quotes, and durable draft saving only; it does not bypass the empty deployment gate. The gate is enforced in the controller/runtime, not only by disabled buttons.

### Tests, CI, and packaging

- `package.json:30-39` preserves master's Jest command and adds the feature Node suite, strict swap lint, and composable `test:all` command.
- `.github/workflows/ci.yml:31-64` performs clean install, broad lint, Jest+coverage, Node swap tests, strict swap lint, production build, manifest-file verification, and bundle upload.
- `webpack.config.babel.js:7-10` builds both `app.js` and `solana-signer.js`; `nxs_package.json:10-22` packages both bundles plus the companion HTML (12 manifest files total).
- A production build redirected to `/tmp/dex-review-build` produced both bundles. Repository source was not modified by the reviewer.

## Commands and results

| Command | Result |
|---|---|
| `git status --short --branch`; `git rev-parse HEAD MERGE_HEAD`; `git diff --name-only --diff-filter=U`; `git diff --check HEAD` | Merge in progress at the anchors above; no unmerged paths; diff check passed. |
| branch/base diffs for `Main.js`, `stablecoinSwap.js`, `configureStore.js`, package/CI, swap runtime and tests | Both branch intents compared. Master polling/session/Jest/CI intent and feature provider/journal/recovery/packaging intent are present in the final tree. |
| `npm test -- --ci --runInBand` | PASS: 5 suites, 41 tests. The configure-store fixtures emit a non-blocking Redux warning when the journal storage key is temporarily visible to `combineReducers`; journal persistence assertions pass. |
| `npm run test:swap` | PASS: 93 top-level tests / 110 assertions, 0 failures. |
| `npm run test:all` | PASS on reviewer Node `v22.23.2`: 41 Jest tests + 110 swap assertions. Parent independently reported the same final command PASS on CI-target Node `20.19.5`. |
| `npm run lint` | PASS: 0 errors, 21 inherited warnings. |
| `npm run lint:swap` | PASS: 0 warnings. |
| `npx cross-env NODE_ENV=production webpack --config webpack.config.babel.js --output-path /tmp/dex-review-build` | PASS: `app.js` and `solana-signer.js` emitted; only webpack size advisories. |
| package-lock root dependency check | PASS: lock root matches both Solana dependency declarations. |
| manifest existence check | PASS: all 12 `nxs_package.json` files exist. |
| real installed `nexus-module` isolated boundary probe | PASS after supplying the SDK's required host-shaped React/emotion globals: session update and legacy storage paths exercised; journal funding blocked without acknowledgement. Two preliminary harness attempts failed before application construction because those host library globals were incomplete; this was a probe setup issue, not a candidate failure. |

## Reviewed SHA-256 hashes

```text
21226b867f3d64bfacadccadd0680b377501bb3dc2523fac704199d83e979e5d  .github/workflows/ci.yml
98de914cc787f7c8e1585724b19d6cded5b7c20ffaa40e9aed65a3d5a917fd2a  package.json
8bcd93593b25d884e0e880f2e189e6014adbef03c8cd25b95aacc6d4c5533fcf  package-lock.json
7db2bda23b01cd49e9032af4a1481f960b8dd99ec61c4ba5a282bdeea0448f14  nxs_package.json
6d91f1ae0e48fd813deb25a6b7d247462f1e302b4b4c9a4f0fe5d0946fdfd789  webpack.config.babel.js
d251a1166ddfb1228b0cab87ba4415d36bf8fdc23f8289e4b7750dfabcc30bb4  webpack-dev.config.babel.js
ee25fea20aa2b2e2d23ca0f8c069928d808ee538c9cb01019f4bdf3e97eae3ea  src/App/Main.js
2a67f5e161efcc9d161a69fdd946c65dac7740f3cf90cff4cfdab529969d5c4e  src/App/stablecoinSwap.js
409f78f8206faa4d3eb0d3c7ab4c768619332be996c200a407dfe1f8ae70f637  src/configureStore.js
27121a40815f3379d6b81dc2e83cad92bd99e021dbf244965238326cd577aa7b  src/swap/controller.js
baee61c193fba359a491ac4e5580d2a15789a6985636e203b4e58dc51c6c9963  src/swap/deployment.js
00e3c7238a6250cc93a5eadf511275b14a19fddfcebe2cc825e517b1405484e7  src/swap/jobs.js
1311ed4cefbdefe309d744aa8a728af4938cb48eaba69bae65ac3ca17803276f  src/swap/money.js
b41e58290fb61b012134e922c0b3d73ea927d648be98ed7be3bea8cd5e108219  src/swap/nexus.js
26b7284eece7ba1581f7f656fe9000f64176c1b665b9c2c40dfd6507274869a6  src/swap/persistence.js
5dceb8d8bb78adbf5675df2d4db869a4c9b6dedd8b62e41ae1fb4d8a04842aa2  src/swap/providers.js
adfdd6f054b831e0bbe50a3c37ac04f84e5209e134fd8c7ad211fcbc20ca3635  src/swap/runtime.js
80a540c04aeee7e68a6da1611af8e03fb75b470d927ae67c02ca9ba7d3acb019  src/swap/signingPage.js
4edc45cdbcc4ba6530e9c68e66b38b7eecc55cf1aadc010fc13cb8572b655f82  src/swap/solana.js
67d7a2ef80f95a3523a350f8227c0369735cf06e13a3a2e22892639c9086449e  __tests__/configureStore.test.js
6ce5594ac776ced347225025adc64fb623ac33a2fc9fe1462747f2cd549e4520  test/swap/controller.test.cjs
bada2c59519e875fdadf18db9dac12eb04ec99fcbbc7c703023cea98639ac645  test/swap/integration.test.cjs
539be61e0f27b0adb2578e6b1a3519bf31241a4a67fcf23edccfa2a3f885a0a2  test/swap/nexus.test.cjs
761155eb7b7b6baecaffd25d580950388352c38b8256a7dcf2eb6069edcda0f7  /tmp/dex-review-build/app.js
2f2f67a0ffdfab487188a85e9e41181465d97db270045513ed05a2147879760e  /tmp/dex-review-build/solana-signer.js
```

Review was read-only with respect to `/home/brutus/github/DEX-reconcile`: no repository file was edited, staged, committed, or pushed by the reviewer.
