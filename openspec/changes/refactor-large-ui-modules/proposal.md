## Why

Large UI modules now mix DOM orchestration, Three.js runtime code, data conversion, parsing, and domain logic in single files. This makes future feature work expensive because common changes require loading and editing thousands of unrelated lines.

## What Changes

- Refactor large modules into stable public facades plus focused internal modules without intentional behavior changes.
- Keep existing `window.*` handlers, HTML onclick wiring, and module exports compatible.
- Split the Avatar Forge E2E coverage into smaller scenario files before deeper refactors.
- Add non-blocking code-size auditing to surface large files without failing normal checks.
- Add a safe local artifact cleanup script with dry-run default and explicit `--apply`.
- Leave template JSON lazy loading for a later performance-oriented change.

## Capabilities

### New Capabilities
- `codebase-maintainability`: Internal maintainability requirements for modular facades, non-blocking size auditing, and safe local cleanup tooling.

### Modified Capabilities

## Impact

- Affected areas: animation, avatar, texture, SVG, viewport, scripts, and E2E tests.
- Public API compatibility is required for `bindings.js`, `index.html`, and existing Playwright tests.
- No new runtime dependency is expected.
