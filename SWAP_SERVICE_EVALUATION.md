# swapService Client Evaluation — DEX

**Reviewed:** 2026-09-07. **Scope:** on-chain provider discovery, selection, initiation and completion in the DEX wallet module; architecture and development recommendations, not implementation or production transactions.

**DEX baseline:** `9ea48d923df7c4463b5a5bd9d7388bf11d87b601`, branch `performance/eslint-and-memo`, with pre-existing working-tree changes. **Service comparison:** sibling `swapService` at `b230f7c0c5e21bf57f9cb792c4b54dc9b3afbf5f`; its executable source/tests/registration helper are unchanged from `0851b774d1cbe4eabcdabe2cccb04a0307aa9d7c` in the inspected diff.

## Verdict

**A dormant, hardcoded single-provider prototype—not an implemented provider marketplace or a production-safe cross-chain swap client. Keep transaction access disabled.**

`StablecoinSwap` is imported, but both its navigation tab and rendered component are commented out in [`src/App/Main.js`](src/App/Main.js):182–202. The findings below describe code that would become reachable if that gate were removed; they are not evidence that the currently routed UI is sending bridge transactions.

The native Nexus order-book functionality and the custodial cross-chain bridge are separate protocols. Running inside a DEX does not make an operator-custodied bridge trustless or atomic.

## Capability assessment

| Capability | Current state | Evidence |
|---|---|---|
| Reachable swap tab | Disabled | `Main.js:182–202` |
| On-chain provider discovery | Not implemented | No provider list/type-discovery/selection path; `stablecoinSwap.js:256–264` reads one hardcoded name |
| Provider identity and trust validation | Not implemented | Record address constant is not used for lookup; owner, type, schema, network, custody and terms are not validated |
| Configurable token pair | Not implemented in DEX | Hardcoded USDC mint, USDD ticker, addresses, decimals in formatting, fees and minimum: `159–173`, `195–201`, `395–399`, `975–1069` |
| Solana→Nexus initiation | Manual-instructions prototype | No embedded Solana signer; displays transfer/memo and accepts a pasted signature: `1094–1148` |
| Nexus→Solana initiation | Incompatible/incomplete | Debit payload lacks documented `from`/`to`; no mapping asset creation/update: `847–921` |
| Completion evidence | Unsafe heuristics | Balance delta / substring memo / 95% tolerance; no exact per-source finalized settlement proof |
| Restart/resume | Not implemented for swaps | Component-local state; disk middleware persists settings only |
| Provider availability | Timestamp indicator only | Ignores published status and does not gate sends |
| Solvency assurance | Not established | Hardcoded vault/supply ratio without complete liabilities or custody proof |
| Release verification | Incomplete | Build passes; lint red; no runnable test command or swap regression suite |

Source line ranges below refer to the unchanged [`src/App/stablecoinSwap.js`](src/App/stablecoinSwap.js) unless another file is named.

### Useful pieces worth retaining

- The feature is contained behind commented navigation and rendering, rather than exposed with
  these known gaps.
- Nexus mutations use the wallet's `secureApiCall` confirmation boundary; no private Solana key
  is introduced by the external-wallet flow.
- Input Solana inspection rejects `meta.err` and, for recognized top-level transfer instructions,
  checks the hardcoded mint/destination and selected Nexus memo account.
- There are initial status, fee, reserve and transaction-progress UI components to reuse after
  their data sources and evidence contracts are corrected.

These are partial building blocks, not an end-to-end safety guarantee.

## Release-blocking findings

### DEX-SWAP-01 — Discovery, selection and immutable provider binding are absent

**Evidence:** `159–173`, `256–264`, `356–375`, `395–399`.

The component uses one literal `AkstonCap:swapServiceHeartbeat_2` name, one Solana vault, one mainnet USDC mint and the ticker `USDD`. The declared status asset address is not used to read the record. It extracts only `last_poll_timestamp`, discarding provider identity, custody addresses and advertised terms.

A name lookup is not provider discovery. There is no normalized provider record, list paging, schema adapter, token-register validation, owner policy, network binding, provider selection or revalidation before funding. Discovering an on-chain record would establish publication, not operator honesty or backing.

**Required outcome:** read-only discovery with explicit incomplete/error states; identity keyed by Nexus network and provider asset register address; schema-aware validation; independent token/custody checks; selected-provider snapshots. Unknown schema/identity/network means inspect-only, not send-enabled.

### DEX-SWAP-02 — Nexus initiation does not implement the current API or routing contract

**Evidence:** `887–905`; there are no routing-asset writes in this component.

The submitted payload is `{address: usddAccount, amount: parseFloat(amount), reference: 'USDC_SOL:<address>'}`. The inspected Nexus Finance API contract requires `from` and `to`, and defines `reference` as an unsigned 64-bit integer—not a free-text destination field. The payload supplies no treasury destination. This is a contract mismatch; no live-node rejection or debit was exercised in this review.

Current swapService separately looks for a user-owned asset containing **`txid_toService` and `receival_account`**, matched with the sender's built-in owner identity. DEX never creates or updates it. Adding a `to` field alone will not make the flow complete.

**Required outcome:** verified source account/token, selected treasury, exact amount encoding and supported numeric reference semantics; durable debit intent; capture/read back the real transaction identity; publish and verify a per-job mapping without overwriting another pending job. Wallet rejection, accepted-but-timeout and mapping failure after debit must be separate states. Retrying metadata publication must never repeat the debit.

### DEX-SWAP-03 — Recipient validation accepts a contract the provider does not support

**Evidence:** `507–565`, `868–877`, `1151–1157`; service `src/swap_nexus.py:238–265,365–366`.

DEX permits an owner wallet if any USDC token account exists and returns an owner rather than a resolved destination token account. The current service requires an **existing configured-mint SPL token-account address** in `receival_account`; its main payout path neither resolves owner wallets nor creates an ATA.

There is also an SDK mismatch in the fast path: `getAccount()` results are checked through `accountInfo.state === 1`, whereas the installed SPL-token account interface exposes initialization/frozen booleans. Fallback calls do not make the owner-address contract correct.

**Required outcome:** resolve an owner to an exact token account locally if that UX is desired; verify classic Token Program, mint and usable account state; freeze and publish the token-account address, not the owner. Keep owner identity separately for display only.

### DEX-SWAP-04 — Displayed memo fails the component's own validator

**Evidence:** `465`, `632–643`, `1121`, `1273`.

The exact displayed memo is `nexus:<account>`, but validation requires `.startsWith('nexus: ')` and slices after the added space. The UI also mixes this with spaced prose. Consequently a transaction following the displayed exact memo is locally labelled `refunded`, without observing any refund.

**Required outcome:** one provider-derived, case/byte-defined memo codec shared by instructions and verification. A validation problem or unknown outcome is not an observed refund. Refund status requires attributable successful chain evidence.

### DEX-SWAP-05 — Quotes and minimums disagree with the provider

**Evidence:** `165–167`, `195–201`, `419–427`, `853–855`, `1059–1069`.

DEX applies a `0.1` flat fee, `0.1%` percentage fee and `0.2` minimum in both directions using JavaScript `Number`/`parseFloat`. It ignores on-chain terms and independent precisions.

An offline run of the unchanged functions demonstrated:

| Synthetic one-token input | DEX quote | Current service, default six-decimal terms |
|---|---:|---:|
| Nexus→Solana output | `0.899` | `0.499` |
| Nexus-side processing minimum | `0.2` | `1` |

These are default-fixture observations, **not live provider quotes**. The service's published flat fees are `0.1` toward Nexus and `0.5` toward Solana in their respective output units. A user following DEX's advertised low Nexus minimum can fall into the provider's fee-only policy rather than receive a swap.

**Required outcome:** decimal-string parsing and integer-base-unit calculations; chain-specific precision, flat-fee domain, basis points, minimum, dust, limits and rounding policy; immutable quote snapshot. Re-read provider terms before authorization. A client snapshot does not lock an operator's future policy unless the provider protocol explicitly supports that commitment.

### DEX-SWAP-06 — Completion can be false or missed

**Evidence:** `603–666`, `688–705`, `737–741`, `793–824`, `905`.

- Solana→Nexus completes on an account balance increase of at least 95% of an estimate, not an identified provider payout. Unrelated credits can satisfy it; an early payout or subsequent spending can make a real completion invisible.
- Nexus→Solana scans only the latest 30 vault signatures, accepts `confirmed` transactions, matches the debit ID as a memo substring and aggregates changes across an owner's USDC accounts. It does not enforce the service's exact `nexus_txid:<txid>:<contract_id>` identity, destination token account, authorized source/signer and exact output.
- That tracker is given the gross Nexus input at `905`, rather than the quoted net output. Legitimate fee deductions can therefore prevent completion, especially near the minimum.
- A Nexus transaction with a timestamp but no confirmation evidence can be treated as confirmed at `741`.

**Required outcome:** reconstruct exact source and output evidence under a frozen job contract; distinguish submitted, confirmed, finalized and user-credited. Use balance observations only as diagnostics. Bounded history misses remain incomplete, not failure or refund evidence. Validate actual CREDIT/DEBIT attribution and claim behavior on the target Nexus build.

### DEX-SWAP-07 — No durable job lifecycle; polling ownership is fragile

**Evidence:** `204–231`, `294–298`, `389–393`, `658–660`, `688–706`, `828–845`, `918–926`; [`src/configureStore.js`](src/configureStore.js):11–27.

All job data and interval handles live in React state. No bridge job journal persists a provider snapshot, exact terms, source IDs, mapping address or ambiguous submission. Disk persistence saves settings, not swaps. Account data is fetched once on mount rather than being explicitly scoped to wallet/profile/network changes.

The actual debit handler also treats a mocked successful empty response as “debit submitted” and
shows a success notification, despite storing a null transaction ID and starting no monitor
(`893–906`). This was reproduced offline; it is not evidence of a live debit. Such a response must
be an unresolved submission requiring recovery, not a successful tracked job.

Polling callbacks capture render-time state. For example `startNexusPolling` captures `nexusBaselineBalance`; setting it later does not update that closure. The effect described as unmount cleanup also runs on every `transactionStatus` change, and can cancel the monitoring, service-status and backing timers during normal progress. Async `setInterval` callbacks can overlap; terminal display state alone does not prevent a second send once `isLoading` clears.

**Required outcome:** a persisted per-job state machine outside the component; one serialized observer per job; cancellation/generation fencing; explicit suspend/resume on profile/network changes. Disallow repeated submission while the prior outcome is unknown. Preserve public job evidence, never PINs, credentials or sessions.

### DEX-SWAP-08 — Availability and reserve indicators overstate what they establish

**Evidence:** `267–280`, `301–375`, `952–962`, `1162–1165`, `1282–1309`.

A future timestamp is clamped to age zero and displayed online. The provider's published `status` is ignored. Even a displayed offline status is not part of the send button's disabled expression or `handleSwap` validation.

The reserve display divides a hardcoded Solana balance by ticker-resolved Nexus supply. Its direct token-account balance read does not bind that balance to the configured mint. It has no complete pending-liability, treasury, quarantine, shared-vault or multi-provider attribution model. A green ratio is not a solvency attestation.

**Required outcome:** separate reported liveness, supported/validated identity, operator pause, independently observed liquidity and evidence completeness. Unknown, stale, future-dated, paused or mismatched records fail closed for new funding. Provider-controlled RPC URLs or status strings must not become settlement authorities.

## Cross-repository compatibility boundary

| Contract | Current swapService | DEX consumption | Development decision |
|---|---|---|---|
| Recommended v1 identity | `distordiaType=nexusBridgeHeartbeat`, built-in owner and asset address | Reads one name and timestamp only | Explicit v1 discovery/normalization adapter; address-bound readback; validate identity independently |
| Legacy heartbeat variant | Includes `supported_tokens`/`supported_chains`; fixed field set differs | No schema distinction | Separate adapter; do not interpret a metadata list as live multi-pair support |
| Pair and custody | `nexus_token`, `nexus_token_register_address`, `nexus_treasury_address`, `solana_token`, `solana_vault_mint`, `solana_vault_address` | Hardcoded independent constants | Use the selected validated pair/custody; derive precision from authoritative token metadata where v1 omits it |
| Fees and minima | Directional flat fees, `fee_bps`, `min_to_nexus`, `min_to_solana` | One local formula and minimum | Shared fixtures and exact quote engine; missing policies must not be silently invented |
| Input memo | Configured `memo_prefix` plus Nexus account | Conflicting hardcoded strings | Shared versioned memo codec |
| Nexus routing | `txid_toService` + matching owner + existing-token-account `receival_account` | Missing | Implement verified mapping publication and resumable debit/mapping sequence |
| Solana payout attribution | Exact `nexus_txid:<txid>:<contract_id>` with authoritative transfer evidence | Substring plus owner delta | Exact composite identity and destination/amount/finality validation |
| Refund/hold | Nexus dispositions require explicit operator workflow | Some local errors labelled refunded | Represent unknown/held separately; terminal refunds require chain proof |
| Provider v2 | **Planned**, including exact `distordia-type=swapService`, schema/service IDs and address-based writer isolation | Absent | Coordinate a versioned provider contract; do not require an unimplemented v2-only query for initial v1 read-only discovery |

The current v1 public record is built in sibling `swapService/src/nexus_client.py:1828–1866`. It does not provide every proposed v2 field or an immutable per-job terms commitment. The provider-v2 contract is a migration design, not deployed functionality. Global discovery/filter syntax and indexing/visibility must be validated against the target Nexus build; local source review does not prove that public records are discoverable from a clean client node.

**Independent service blocker:** the reviewed swapService source still checks its daily cap in the refund/quarantine send helper but not the main Nexus→Solana payout helper. This was already recorded in its current evaluation. A correct DEX UI does not repair that operator-side bypass or establish production readiness.

**Provider publication/recovery dependency:** `build_service_record()` defaults omitted safe
waterlines to zero and `publish_service_record()` includes those fields in the update when the
existing asset contains them (`swapService/src/nexus_client.py:1846–1847, 1889–1898`). An offline
probe against the actual publisher, with only its asset-read/CLI boundaries mocked, generated
both `last_safe_timestamp_solana=0` and `last_safe_timestamp_nexus=0` despite a fixture with
nonzero existing checkpoints. This is a command-construction finding, not an observed on-chain
write. Separate initial registration defaults from update semantics; omitted checkpoints must
mean unchanged. Prove per-instance monotonic publication and address-based isolation before
relying on multi-provider status/recovery. This backend repair is outside this DEX documentation
review.

## Architecture recommendation

Keep the existing Nexus Wallet bridge and Redux integration, but replace the single-component orchestration with explicit responsibilities:

1. **Provider repository:** list/page/read on-chain assets; normalize current-v1, legacy-v1 and future-v2 records into a versioned model. Return discovery completeness separately from candidates.
2. **Provider policy/validation:** immutable addresses, built-in owner, token identities/decimals, chain/network, permitted programs, advertised terms, custody and clock/status checks. Trust labels are explicit policy, not inferred from a ticker or type field.
3. **Quote and protocol core:** pure exact-unit functions plus memo/mapping codecs and strict versioned evidence parsers. No React, timers, wallet prompts or network access.
4. **Swap job store/state machine:** one durable journal per profile/network/provider/job; immutable funding snapshot; action intents and observed chain identities; migration and retention rules.
5. **Chain adapters:** Nexus reads and PIN-confirmed mutations through `nexus-module`; independently configured Solana RPC and optional external-wallet handoff. No automatic retry of ambiguous writes.
6. **Observation/recovery engine:** serialized, cancellable polling; exact evidence matching; resumable scans; visible incomplete/held states. Never retarget a funded job when a provider is changed or disappears.
7. **Thin UI:** provider list/details, quote review, direction-specific funding steps, job history and recovery/support actions. Provider inspection can ship read-only before sends are enabled.

Use **Cross-chain swaps** or **Bridge providers** rather than hardcoding stablecoin branding. The supported service model is one configured classic-SPL/Nexus pair per deployment, with nominal 1:1 token-unit conversion before fees—not arbitrary-chain swaps, Token-2022 support or a market-priced exchange.

See [the proposed development plan](SWAP_SERVICE_DEVELOPMENT_PLAN.md) for ordered milestones and acceptance criteria.

## Executed verification

| Check | Actual result / limit |
|---|---|
| `npm run build -- --output-path /tmp/dex-swap-assessment-build` | Pass; webpack 5.99.9, 846 KiB entry, three performance warnings. Uses dirty working implementation and untracked ErrorBoundary destination; not clean-HEAD or wallet-host acceptance. |
| `npm run lint -- --format json --output-file /tmp/dex-swap-eslint-full.json` | Fails: 34 errors, 118 warnings. Swap component alone: 18 errors, 19 warnings. |
| `npm test -- --runInBand` | Unavailable: missing `test` script. A Jest config/test/mock skeleton exists; this is not a running gate. |
| Offline AST diagnostics | Actual unchanged functions/expressions reproduce fixed quote `0.899`, future/paused heartbeat reported online, offline send button enabled, timestamp-only Nexus confirmation accepted. |
| Offline lifecycle probes, independently rerun | Actual production closures reject the displayed memo; retain a stale null baseline across two ticks; mark a synthetic 95-unit unrelated owner delta completed for 100 input without vault-source proof; and announce submission without a transaction ID or monitor. These are observed defects under mocked boundaries, not passing release tests. |
| Offline service quote comparison | Actual unchanged `build_service_record()` and `get_solana_send_amount_units()` under isolated synthetic config return `499000` Solana units for `1000000` Nexus units, with `min_to_solana=1`; no node calls. |
| Offline service publisher boundary | Actual unchanged publisher builds zero-valued safe-waterline updates when arguments are omitted; existing-record read and CLI execution are mocked. No publication took place. |
| Live wallet / node / swap | Not exercised. No RPC, on-chain publication, credentials or production funds used. |
| Dependencies | No installs/upgrades/security remediation; Nexus Interface compatibility deferral preserved. |

Session-only diagnostic artifacts: `/tmp/dex-swap-ui-probes.cjs`, `/tmp/dex-swap-ui-probes.json`, `/tmp/dex-swap-service-terms-probe.py`, `/tmp/dex-swap-build.log`, `/tmp/dex-swap-eslint-full.json`, `/tmp/dex-swap-test.log`. These are audit probes, not a committed CI suite.

The additional production-closure harness is `/tmp/dex-swap-probes.js`; its independently checked
results are `/tmp/dex-swap-lifecycle-probes-verified.json`. Separate read-only lifecycle and
provider-contract reviews are `/tmp/dex-swap-lifecycle-review.md` and
`/tmp/dex-swap-provider-contract-review.md`. Their key findings were checked against source and
incorporated here; recommendations in those reports are not implemented capabilities.

## Review scope and preservation

Existing `ARCHITECTURE.md`, `IMPROVEMENTS.md`, `package.json`, `src/App/Main.js`, the ErrorBoundary relocation and backup/original artifacts were present before this review. The previous dated general review is preserved. This task adds evaluation/planning documentation and updates focused architecture/navigation guidance; it does not enable the tab, repair runtime code, change dependencies, stage, commit or push.
