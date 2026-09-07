# Provider-aware Cross-chain Swap Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Replace the dormant prototype with discoverable provider inspection, exact quotes, durable funding/recovery, exact settlement proofs, and memo-capable non-custodial Solana signing.

**Architecture:** Pure provider/quote code, Nexus and Solana adapters, a serialized persistent job controller, and a thin wallet-module tab. A browser signing companion handles extension wallets where Electron has no injected provider. Private keys never enter DEX. Live-network acceptance is distinct from deterministic adapter/controller/UI tests.

**Tech Stack:** Existing React/Emotion/Nexus bridge, existing Solana web3/SPL SDKs, Node's built-in test runner. Preserve dependency versions and all unrelated work; no commits/pushes or real-fund tests.

## Shared implementation contract

New testable modules are CommonJS in `src/swap/` (named exports usable by webpack); tests use `node --test test/swap/*.test.cjs` with no new test-runner dependency.

Provider shape: `schema,address,owner,name,nexusToken,nexusTreasury,nexusSymbol,solanaMint,solanaVault,solanaSymbol,memoPrefix,feeBps,feeFlatToNexus,feeFlatToSolana,minToNexus,minToSolana,timestamp,status`. Validated enrichment adds `nexusDecimals,solanaDecimals,solanaVaultOwner,solanaGenesis,nexusNetwork`.

Job shape: `id,scope,direction,provider,quote,nexusAccount,solanaAccount,state,sourceTxid,sourceContract,payoutTxid,mappingAddress,createdAt,updatedAt`. Direction is `solana-to-nexus` or `nexus-to-solana`. Quote fields are exact decimal strings `inputUnits,outputUnits,feeUnits,inputAmount,outputAmount`. Scope includes wallet genesis and both network identities. No secrets or sessions in the journal.

## Execution tasks

Each implementation owner writes a behavioral failing test, runs it, implements the smallest slice, then repeats with failure cases. Tests replace only transport/signing/storage boundaries.

1. **Provider and money core** — `src/swap/providers.js`, `money.js`, `test/swap/providers.test.cjs`, `money.test.cjs`. Strict recommended-v1 adapter; paginated complete/incomplete discovery; exact independent-decimal directional math. Unsupported records are inspect-only, not silently defaulted. Commands: `node --test test/swap/providers.test.cjs test/swap/money.test.cjs`.
2. **Solana signing/evidence adapter** — `src/swap/solana.js`, `signingPage.js`, `dist/solana-sign.html`, `test/swap/solana.test.cjs`. Build TransferChecked + memo; connect/sign with an injected external wallet without importing keys. Browser companion for Electron. Solana Pay alternative only for an actual recipient ATA. Verify exact successful finalized deposits/payouts, including source vault and composite memo. Command: `node --test test/swap/solana.test.cjs`.
3. **Nexus adapter** — `src/swap/nexus.js`, `test/swap/nexus.test.cjs`. Read provider token/treasury identities, list matching owned accounts, exact PIN-confirmed debit, unique owner-bound mapping, and attributable source/output evidence with honest ambiguous states. Trace actual swapService CREDIT/DEBIT and memo/reference semantics; never invent a contract ID. Command: `node --test test/swap/nexus.test.cjs`.
4. **Journal/controller** — `src/swap/jobs.js`, `controller.js`, `test/swap/jobs.test.cjs`, `controller.test.cjs`. Atomic browser journal transaction before mutation; unique source IDs; profile/network scoping; no repeat on lost response; mapping-only repair; serialized observer and explicit evidence import/recovery.
5. **Tab/package integration** — replace `src/App/stablecoinSwap.js`, narrowly update `src/App/Main.js`, build config and module manifests to ship the signing companion. Add `test` / `test:swap` / `lint:swap` scripts without changing dependency versions. Keep all existing unrelated Main edits.
6. **Verification/review** — run complete swap tests, production build outside tracked dist, scoped lint, browser harness/DOM checks; independent specification and money-safety reviews of the exact candidate; fix/retest findings. Update architecture, evaluation, development status and user instructions with implemented versus live-unverified boundaries.

## Solana wallet decision

Ordinary Send UI memo support is not required if a dApp constructs the transaction and a wallet signs it. Prefer injected wallet transaction signing; use a bundled standalone browser companion when the Nexus Electron WebView has no extension provider. Solana Pay transfer URIs carry a memo but support recipient ATAs, not arbitrary auxiliary vault accounts. Mobile deeplinks/WalletConnect require additional transport/session/redirect integration and are not interchangeable with basic send links. Do not create a custom custodial/key-import wallet.

## Release boundary

Do not send funds during development. Incomplete provider metadata, unknown networks, unresolved outcomes or insufficient exact proof block unsafe actions and never become Completed/Refunded. Mainnet funding remains a deployment acceptance decision; tests with synthetic boundaries are not live-node/wallet proof. Current service publication/checkpoint and daily-cap gaps remain upstream blockers, not silently fixed by this client.
