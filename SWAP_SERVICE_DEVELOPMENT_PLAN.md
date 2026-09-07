# swapService Client Development Plan

**Date:** 2026-09-07. **Status:** proposed development, not implemented. **Basis:** [source-grounded evaluation](SWAP_SERVICE_EVALUATION.md). Existing unrelated application work and Nexus Interface dependency constraints remain in force.

## Product boundary

The feature should let a user discover provider records on Nexus, inspect a provider and its configured pair, approve an exact funding instruction, and follow the resulting job to attributable completion or a clearly explained unresolved state.

It is a **custodial cross-chain bridge client**, distinct from native Nexus market orders. On-chain publication is not provider endorsement. Initial support is one classic SPL Token Program mint / Nexus token register per provider deployment; multiple provider records may belong to one operator. Do not advertise arbitrary assets, Token-2022, market-priced conversion or multi-chain execution merely because a record can describe them.

**Recommendation:** deliver read-only provider discovery first, then a tested end-to-end single-pair workflow. Keep the dormant transaction UI disabled until funding and settlement gates pass. Simply uncommenting `StablecoinSwap` is not a valid release step.

## Architectural contracts

### Provider identity and adapters

Use `(nexusNetworkIdentity, providerAssetAddress)` as the provider key—not its local name, display ticker or owner alone. One owner can publish several deployments.

A normalized provider model should distinguish:

- raw record/version and evidence source;
- immutable asset address and built-in owner;
- Nexus network and Solana cluster/genesis identity;
- exact Nexus token register and SPL mint, independent decimal precisions;
- treasury, vault, quarantine and fee-account roles where supported;
- supported directions and protocol/memo/mapping versions;
- directional fee, minimum, dust and cap policies with explicit unknown fields;
- declared operational status and separately measured liveness;
- validation results, trust-policy status, discovery completeness and reasons funding is disabled.

**Current compatibility:** recommended v1 uses `distordiaType=nexusBridgeHeartbeat`; older v1 heartbeat fields differ. Build explicit adapters and independent token-metadata reads. Missing required terms/identity must mean unsupported or inspect-only, not fallback to old USDC/USDD defaults. A current v1 adapter does not require changing the provider's name-based writer to let the client pin an asset address.

**Future target:** provider-v2 uses exact `distordia-type=swapService`, schema/service IDs, address-based instance isolation and a fuller public contract. It remains planned in swapService. Agree its schema, field-size budget, migration rules and target-node query semantics jointly before enabling a v2 writer or reader as production infrastructure. Do not invent a v2-only discovery query and call existing v1 providers absent.

**Upstream release dependencies:** distinguish registration defaults from publisher updates so
omitted safe waterlines remain unchanged, verify address-bound per-instance checkpoint isolation,
and close the main Nexus→Solana daily payout-cap bypass. These are swapService responsibilities;
a DEX parser or UI guard cannot substitute for those service-side controls. Include their
regression and live-boundary evidence in M5 acceptance.

### Frozen job contract

Before any funds-moving authorization, persist a versioned job containing:

- local job ID plus wallet profile/genesis and network scope;
- provider asset/owner and observed record/terms version or locally computed public snapshot hash;
- source account, destination token account and both immutable token identities;
- exact input/output/fee base-unit strings and decimal scales;
- memo bytes, mapping identity and supported numeric reference if used;
- submission intents, transaction IDs/signatures, source contract IDs and observation cursor;
- validated evidence, timestamps and reason-coded current state.

A local hash is evidence of what the user approved, **not proof that the provider contractually locked that quote**. If current v1 cannot commit or echo per-job terms, define the quote's advisory status and operator change policy explicitly; a guaranteed quote requires coordinated provider support.

Never persist PINs, sessions, signing keys or private RPC credentials with jobs. Nexus module storage has a bounded size and is not automatically a transactional database; validate its write-acknowledgement/durability semantics, version records, and apply bounded history/export rules before using it as the pre-submit intent journal.

### Proposed job states

```text
Draft -> ProviderValidated -> QuoteReviewed -> FundingIntentPersisted

Solana input:
  AwaitingExternalSignature -> DepositObserved -> DepositFinalized
  -> AwaitingNexusOutput -> NexusOutputVerified -> Completed

Nexus input:
  AwaitingWalletApproval -> DebitSubmitted -> DebitConfirmed
  -> RoutingMappingPublished -> RoutingMappingVerified
  -> AwaitingSolanaOutput -> SolanaOutputFinalized -> Completed

Nonterminal exceptional states:
  SubmissionUnknown | ObservationIncomplete | ProviderUnavailable |
  MappingRepairRequired | AccountOrNetworkSuspended | OperatorHold

Terminal states only with evidence:
  CancelledBeforeFunding | Completed | RefundVerified | DispositionVerified
```

The mapping asset can be prepared before debit, but its real transaction binding can only be finalized after the transaction identity is known. Persist intent before each mutation, read back each write and preserve per-job mapping isolation. The precise user-DEBIT/provider-CREDIT identity relation must be proven on the target Nexus build; do not synthesize contract IDs from UI sequence numbers.

Do not convert a timeout, missing lookup or changed balance into a terminal refund. Never automatically resubmit an uncertain debit, switch the provider for a funded job, or reuse another job's destination/quote snapshot.

## Milestones and acceptance criteria

All milestones below are **pending**; they describe the recommended order, not a completed implementation.

### M0 — Containment, integration contract and executable regression baseline

**Priority:** first. **Ownership:** DEX, with swapService API/schema input.

- Keep transaction routing hidden/disabled; isolate the prototype so it cannot accidentally be exposed during unrelated tab work.
- Choose a test runner compatible with the supported Nexus Interface runtime and current lockfile. Do not bulk-upgrade dependencies. Resolve the unrelated ErrorBoundary move separately with explicit path staging.
- Add a real test command and swap-focused lint gate; record any repository-wide baseline rather than calling existing red lint green.
- Define versioned fixtures from current service output and chain evidence; distinguish recommended v1, old v1, future v2 and unsupported records.
- Turn reproduced defects into failing regressions before repairing them.

**Exit:** one local command runs isolated tests without a wallet/node; funding adapters are mocked/fail closed; regressions cover displayed memo, recipient account versus owner, missing treasury/mapping, false completion, partial fees and repeated submission. Build and scoped lint contracts are reproducible. No source/manifest lockfile drift is hidden by cached dependencies.

### M1 — Read-only provider discovery and inspection

**Priority:** first visible product increment. **Ownership:** DEX; target-node query validation jointly owned.

- Add paginated discovery through the wallet's Nexus read API with explicit complete/incomplete/unsupported/error outcomes.
- Normalize known schemas; re-read chosen records by immutable address; validate built-in owner and immutable token/custody identities through trusted chain reads.
- Show all providers, including independent records sharing one owner, with supported pairs, fee/minimum terms, declared status, freshness and trust/validation warnings.
- Reject future timestamps outside an explicit skew policy. A heartbeat is liveness, not solvency or readiness.
- Keep contact/explorer links sanitized. Do not accept provider-supplied RPC URLs as the authority for payment evidence.

**Exit:** tests include multiple providers, same-owner deployments, identical tickers with different registers/mints, wrong network, duplicate records, malformed/schema-unknown assets, missing fields, paused/future/stale records, multiple pages and mid-page errors. Provider selection cannot inherit another provider's addresses. Read-only module rendering is verified in Nexus Interface. Fund actions remain disabled.

### M2 — Exact quote core, protocol codecs and durable job store

**Priority:** required before funding. **Ownership:** DEX plus service policy compatibility.

- Extract React-free decimal/base-unit math and versioned deposit/payout/mapping codecs.
- Derive terms from the selected validated provider and authoritative precision metadata. Show fees in the correct token domain; include minimum, dust/fee-only behavior and constraints.
- Persist funding intent and immutable quote/provider/account snapshots. Scope storage by profile and networks; validate storage acknowledgement and restore behavior.
- Revalidate provider identity/status/terms immediately before approval; changed terms return to review, never silently alter an already funded job.

**Exit:** exact 6/6, 8/6, 6/8, 9/6 and 0/0 fixtures agree with service arithmetic; zero/boundary/overprecision/unsafe-Number inputs are handled explicitly. Reload restores pending jobs without submitting. Account/network switches suspend incompatible actions. Storage failure prevents a new debit.

### M3 — Complete funding workflows without duplicate sends

**Priority:** after M2. **Ownership:** DEX, with target Nexus semantics tested jointly.

**Solana→Nexus MVP:** retain external-wallet handoff rather than introduce a new wallet-adapter dependency immediately. Display/copy exact mint, network, destination token account, amount and memo. Validate a pasted signature against that job, using supported transaction versions/programs and authoritative successful finalized evidence. An embedded Solana wallet can be added later as another funding adapter.

**Nexus→Solana:** resolve/validate a real destination token account; submit a supported `finance/debit/account` payload with exact `from`, `to`, amount and optional unsigned numeric reference through `secureApiCall`. Persist the returned identity. Publish/read back a user-owned `txid_toService`/`receival_account` mapping unique to that pending job. Keep mutation sequencing resumable across separate PIN approvals.

**Exit:** wallet cancellation before send is safe; acceptance followed by timeout produces `SubmissionUnknown`; no duplicate send is possible by double-click, remount or retry. Mapping publication failure retains the debit/job and retries only the mapping. Two concurrent jobs cannot overwrite routing. Unknown token program, owner-only destination, wrong mint/network or changed provider identity is blocked before funding.

### M4 — Attributable completion, holds and recovery

**Priority:** required to complete the product promise. **Ownership:** DEX + service evidence contract.

- Replace balance-delta and substring matching with exact source/contract/reference and destination/amount/mint/source-signer checks.
- Confirm output finality and, on Nexus, actual credit/claim semantics; display debit submission separately from spendable receipt.
- Run one non-overlapping observer per job with cancellation, backoff and generation fencing. Refresh UI state without cancelling unrelated pollers.
- Resume from durable evidence after wallet restart; handle deposits/payouts already completed before observation starts.
- Show explicit held/mapping-repair/provider-unavailable states with evidence export and operator contact. Do not promise an automated Nexus refund.

**Exit:** unrelated credits, split/partial outputs, wrong destination with the same owner, memo-prefix collisions, sibling CREDIT contracts, unfinalized/reverted transactions and failed provider responses cannot complete a job. A payout beyond the first history page is recoverable. Timeouts and incomplete scans retain unresolved status. Config/provider changes cannot rewrite funded-job terms.

### M5 — Cross-repository acceptance and controlled enablement

**Priority:** final release gate. **Ownership:** DEX, swapService operator implementation and wallet compatibility owners.

- Run the whole flow in supported Nexus Interface versions and isolated Solana/Nexus test networks; verify real API field selection, global asset discovery/indexing, confirmation rules, debit-to-credit identity, mapping reads and token decimals.
- Test one provider, two providers and two records owned by one signature chain. Include restart at every boundary, accepted-but-lost response, provider pause/outage, stale terms, incomplete history and explicit operator disposition.
- Close or explicitly contain service-side blockers, including the main Nexus→Solana daily-cap bypass documented in the service evaluation. A client badge cannot substitute for operator-side controls.
- Make local build/lint/tests and exact-candidate CI truthful. Preserve the Nexus Interface dependency compatibility policy.
- Enable discovery/inspection first. Enable funding only after the direction's entire initiation-to-final-evidence path passes; never enable a button on the strength of an isolated send test.

**Exit:** a user can discover a real test provider from a clean client, verify its pair and terms, authorize one transfer, survive restart and obtain exact finalized output evidence—or a truthful durable unresolved state. No real production funds are required for acceptance. Every evidence-dependent label is traceable to its source.

## Recommended first development batch

**M0 plus the read-only part of M1:** establish the swap test boundary and current-v1 adapter, extract immutable provider identity/validation, and build a provider list/details view with send disabled. This directly addresses the missing on-chain discovery requirement while avoiding premature funding exposure. It also establishes the contract consumed by quotes, jobs and chain adapters rather than extending the monolithic component.

Treat broader TypeScript conversion, wallet-adapter replacement, performance refactoring and dependency upgrades as separate work. They do not close the current protocol and settlement gaps by themselves.
