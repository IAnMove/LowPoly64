## Context

The codebase uses `index.html` onclick handlers bridged through `src/bindings.js`, which lazy-loads feature modules. This gives a stable compatibility boundary: large modules can be split internally while preserving the public exports consumed by bindings and tests.

The largest maintainability risks are `motion-ripper-ui.js`, `anim-mode-ui.js`, `avatar-ui.js`, `texture-editor.js`, and the single large Avatar Forge E2E spec. Data JSON files are large but are content, not the primary source of code context pressure.

## Goals / Non-Goals

**Goals:**
- Reduce large UI modules into smaller files grouped by responsibility.
- Preserve current behavior and public exports.
- Make future feature work easier by isolating domain logic from DOM and runtime setup.
- Add visibility into file-size drift without blocking development.
- Add safe cleanup tooling for ignored local artifacts.

**Non-Goals:**
- Do not migrate to TypeScript.
- Do not replace onclick/window bindings.
- Do not change template JSON eager loading.
- Do not redesign UI or change visible workflows.
- Do not intentionally alter feature behavior.

## Decisions

### 1. Keep public facades stable

Large modules remain the import targets used by `bindings.js`. Extracted modules are internal implementation details. This avoids churn in `index.html`, keeps lazy imports intact, and limits behavioral risk.

### 2. Split tests before deep refactors

Avatar Forge E2E helpers and scenarios are split first so later refactors have smaller, targeted regression coverage. Scenario names and behavior stay equivalent.

### 3. Extract by responsibility, not by arbitrary line count

Modules are split around real seams: capture sources, overlay drawing, preview runtimes, pose solving, retargeting, layout, reference video, pose library, diagnostics, form controls, UV editing, and SVG geometry/deformation.

### 4. Size audit is warning-only

The audit reports warning, high-warning, and critical-warning thresholds but exits successfully. This keeps the refactor informative without blocking unrelated urgent work.

### 5. Cleanup script is dry-run first

Artifact cleanup must never delete tracked files and must only operate inside the repository on explicitly allowed ignored paths. Deletion requires `--apply`.

## Risks / Trade-offs

- [Refactor changes behavior accidentally] -> Preserve exports, run focused E2E tests after each phase, and keep commits small by subsystem.
- [Circular imports appear during extraction] -> Keep facades as top-level coordinators and move shared pure functions to leaf modules.
- [Too many tiny modules hurt navigation] -> Extract only cohesive responsibilities with multiple call sites or substantial isolated logic.
- [Cleanup script deletes useful evidence] -> Dry-run by default and restrict deletion to ignored artifact directories/logs.

## Migration Plan

1. Create OpenSpec artifacts and baseline tooling.
2. Split Avatar Forge tests and validate they still run.
3. Extract Avatar Forge internals while preserving facade exports.
4. Extract Motion Ripper internals while preserving facade exports and test helpers.
5. Extract Animation Mode internals and keep timeline/list exports stable.
6. Extract secondary Texture, SVG, and Viewport responsibilities where safe.
7. Run final build, checks, and focused E2E coverage.

Rollback is file-level: each facade continues to expose the original API, so a failed internal extraction can be reverted without touching `bindings.js` or `index.html`.
