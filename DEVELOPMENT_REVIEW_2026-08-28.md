# Development and Architecture Review — 2026-08-28

**Review window:** 2026-08-24 16:07:50 +0200 through 2026-08-28
**Scope:** `performance/eslint-and-memo` at `9e1837408c4aa7add52b76113810c19f86f142bc`, including the pre-existing dirty working tree.

## Verdict

**Not merge-ready.** No material implementation progress was found since `DEVELOPMENT_REVIEW_2026-08-24.md`: there are no commits in the review window, the branch remains at the same commit and is 0 ahead / 0 behind `origin/performance/eslint-and-memo`, and the previously reported ErrorBoundary staging hazard, red lint gate, absent test command, diagnostic exposure, and backup artifacts remain. The production build passes only because webpack can see the untracked replacement file in the current working tree.

The live dependency audit has materially worsened from the prior review's 13 findings to **36 vulnerable packages (2 critical, 14 high, 16 moderate, 4 low)**. With no commit or dependency-manifest change in the window, this reflects the current advisory database rather than repository progress.

## Change since the 2026-08-24 review

- `git log --since='2026-08-24 16:07:50 +0200'` returned no commits.
- `HEAD` remains `9e1837408c4aa7add52b76113810c19f86f142bc`; upstream divergence is `0/0`.
- The index is empty. At review start, tracked changes were `ARCHITECTURE.md`, `IMPROVEMENTS.md`, `package.json`, `src/App/Main.js`, and deletion of `src/components/ErrorBoundary.js`.
- At review start, the six untracked files were the prior review, two `IMPROVEMENTS.md` backups, two `Main.js` backups, and `src/App/components/ErrorBoundary.js`.
- The application diff is still the one-line ErrorBoundary import relocation plus deletion of the old path. Comparing the deleted tracked file with the untracked replacement produced no textual diff (only the replacement's final newline differs).
- Gate results are unchanged for build, lint, and tests: build passes at 846 KiB with three performance warnings; lint reports 34 errors and 118 warnings; `npm test` has no script.

**Conclusion:** no material working-tree implementation change was found relative to the prior review. The material changes in this review are refreshed evidence, a larger live audit result, and documentation corrections.

## Findings

### High — A partial commit can break the application

`src/App/Main.js:24` imports `./components/ErrorBoundary`; `src/components/ErrorBoundary.js` is deleted, while `src/App/components/ErrorBoundary.js` is untracked and the index is empty. `git commit -a` or `git add -u` would include the tracked deletion/import edit but omit the replacement, leaving a missing module. The successful local build does not make that commit shape safe.

Conversely, a broad `git add .` would also stage backup files and the malformed `src/App/Main.js.original`. Stage the intended rename and review documents explicitly; inspect the index before committing.

### High — The lint command exposes unresolved correctness defects

`npm run lint` fails with **152 problems: 34 errors and 118 warnings**. Notable errors include:

- undefined `apiCall`, `setAccounts`, and `showErrorDialog` references in `src/actions/fetchAccounts.js`;
- duplicate `1m` branches in `src/actions/fetchExecuted.js`, making the one-minute branch unreachable after `1m` already means one month;
- numerous empty catch blocks;
- references to `react-hooks/exhaustive-deps` without the rule/plugin being available; and
- TypeScript `interface` syntax in `src/components/solanaProvider.js`, which the configured JavaScript parser rejects.

The counts are identical to 2026-08-24. The command is useful discovery tooling, but it is not an enforceable green gate and no baseline/ratchet policy exists.

### High — Dependency audit currently reports critical and high findings

`npm audit --json` exits non-zero with **36 vulnerable packages: 2 critical, 14 high, 16 moderate, and 4 low**. Critical dependency paths include `shell-quote` and `websocket-driver`; direct dependencies implicated by the report include Babel, Solana packages, webpack, and webpack-dev-server. Some suggested fixes are semver-major or implausible downgrades, so remediation requires dependency-path analysis and regression testing rather than an unreviewed `npm audit fix --force`.

### Medium — No runnable automated test or CI gate

`jest.config.js`, mocks, and `__tests__/apiCache.test.js` exist, but `package.json` has no `test` script and does not declare the Jest/Babel-Jest/jsdom/testing-library dependencies needed by the documented workflow. `npm test` therefore fails with `Missing script: "test"`. No `.github/workflows` directory was found. `CONTRIBUTING.md` still tells contributors that `npm test` exists and that lint is enforced, so contributor guidance remains inaccurate.

### Medium — Error fallback exposes internal diagnostics

`src/App/components/ErrorBoundary.js:29-37` renders raw error messages and React component stacks to the user, and `componentDidCatch` logs full details. Production fallback UI should be generic; detailed diagnostics should be limited to development mode or an operator-controlled reporting channel.

### Medium — Architecture and improvement claims needed further correction

The Redux slices, 15-second market polling, Nexus wallet reducer, and `secureApiCall` usage agree with `ARCHITECTURE.md`. The following claims did not agree with the active code and were corrected in this review:

- `StablecoinSwap` is imported, but its tab and route are commented out.
- No `VirtualizedTable` or reusable `DataLoadingState` exists in this repository.
- ErrorBoundary and API retry handling are partial rather than standardized/merge-safe.
- `jest.config.js` exists, but neither a test script nor GitHub Actions workflow exists.
- `OrderBookComp` is not virtualized in the active repository.

### Low — Untracked backups remain a staging hazard

- `src/App/Main.js.bak` is byte-identical to current `src/App/Main.js`.
- `src/App/Main.js.original` differs, is only 107 lines, and contains literal escaped newline/quote sequences in JSX; it should not be restored or committed without deliberate inspection.
- `IMPROVEMENTS.md.backup` and `IMPROVEMENTS.md.bak` differ from the active document and preserve obsolete implementation claims.
- None of the backup suffixes is ignored by the current `.gitignore`.

### Low — Bundle remains oversized

`npm run build` emits an 846 KiB minimized `app.js`, exceeding webpack's recommended 244 KiB asset and entrypoint limits and producing three performance warnings. Bundle analysis and code splitting remain unimplemented.

## Verification

| Command | Result |
|---|---|
| `git log --since='2026-08-24 16:07:50 +0200'` | Passed; no commits returned |
| `git rev-list --left-right --count HEAD...@{upstream}` | `0 0` |
| `npm run build` | **Passed**; webpack 5.99.9, 846 KiB bundle, 3 warnings, 6513 ms |
| `npm run lint` | **Failed**; 34 errors, 118 warnings |
| `npm test` | **Failed**; missing `test` script |
| `npm audit --json` | **Failed**; 36 vulnerable packages (2 critical, 14 high, 16 moderate, 4 low) |
| `git diff --check` | **Passed** after final documentation edits |

## Merge checklist

1. Stage the ErrorBoundary relocation explicitly and verify the staged tree builds; do not use `git commit -a`, `git add -u`, or indiscriminate `git add .` for this tree.
2. Remove or intentionally ignore backup artifacts; never stage `src/App/Main.js.original` accidentally.
3. Make lint green or establish a documented, measurable ratchet while fixing correctness errors first.
4. Add a supported test toolchain and `test` script, run the existing test, and add coverage for the relocation/error fallback and critical transaction flows.
5. Triage the 2 critical and 14 high audit findings through their dependency paths; avoid blind forced upgrades/downgrades.
6. Restrict ErrorBoundary diagnostics in production.
7. Add CI for build, lint, tests, and dependency review only after each command has an honest local contract.
8. Reconcile `CONTRIBUTING.md` with the commands the repository actually provides.
