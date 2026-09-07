# Development and Architecture Review — 2026-08-24

**Review window:** 2026-08-17 through 2026-08-24
**Scope:** current `performance/eslint-and-memo` working tree; no commits occurred during the window.

## Verdict

**Not merge-ready.** The ErrorBoundary relocation is functionally reasonable, and the production build succeeds, but the replacement file is untracked, the newly exposed lint gate is red, no runnable test gate exists, and current architecture/improvement documentation overstates implementation status.

## Findings

### High — Incomplete Git rename

`src/App/Main.js:24` imports `./components/ErrorBoundary`; the old `src/components/ErrorBoundary.js` is deleted while `src/App/components/ErrorBoundary.js` is untracked. A `git commit -a` or `git add -u` would omit the replacement and create a broken commit. Stage the new path explicitly as a rename.

### High — Added lint gate fails

`package.json` adds `npm run lint`, but the command reports **34 errors and 118 warnings**. Representative blockers include undefined symbols in `src/actions/fetchAccounts.js`, an unreachable duplicate branch in `src/actions/fetchExecuted.js`, empty catch blocks, a missing React Hooks rule/plugin, and TypeScript syntax in `src/components/solanaProvider.js` that the JavaScript parser rejects.

Most are pre-existing, but the new command cannot be described as an implemented quality gate until it passes or a documented baseline/ratchet policy exists.

### Medium — Documented test gate does not exist

`package.json` has no `test` script. `npm test` fails with `Missing script: "test"`. Only `__tests__/apiCache.test.js` is present, while Jest/Babel-Jest/testing-library dependencies are absent. Existing contribution and improvement claims are inaccurate.

### Medium — Error fallback exposes diagnostics

`src/App/components/ErrorBoundary.js:29-37` renders raw error messages and React component stacks. Keep these details behind development mode or an operator-only reporting channel; production users should receive a generic recovery view.

### Medium — File organization is now ambiguous

Moving an app-shell-only component under `src/App/components` can be valid, but it creates a second component root not described by `ARCHITECTURE.md`. Define the boundary (app-local vs shared) or keep the established shared component location.

### Low — Backup artifacts

`IMPROVEMENTS.md.backup`, `IMPROVEMENTS.md.bak`, `src/App/Main.js.bak`, and `src/App/Main.js.original` are untracked and must not merge. Ignore common backup suffixes if they are routinely created.

## Documentation corrections

The active repository does **not** contain `VirtualizedTable`, its utility/tests, or `DataLoadingState`, despite `ARCHITECTURE.md`/`IMPROVEMENTS.md` claiming they are implemented. The virtualization work exists only in the stalled `DEX-old` rebase and is not part of this branch. Lint and test items must be marked partial/blocked.

## Verification

| Check | Result |
|---|---|
| `npm run build` | Passed; 846 KiB bundle, three performance warnings |
| `npm run lint` | **Failed:** 34 errors, 118 warnings |
| `npm test` | **Failed:** no test script |
| `git diff --check` | Passed |
| Dependency audit | 13 known vulnerabilities reported (5 high, 7 moderate, 1 low); pre-existing, still open |

## Merge checklist

1. Stage the ErrorBoundary replacement as a real rename.
2. Remove/ignore backup artifacts.
3. Decide and document app-local versus shared component placement.
4. Establish a lint baseline/ratchet or fix all errors before calling lint an enforced gate.
5. Add a real test runner and make the existing test executable.
6. Restrict production fallback diagnostics.
7. Correct `ARCHITECTURE.md` and `IMPROVEMENTS.md` status claims.
