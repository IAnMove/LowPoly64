# codebase-maintainability Specification

## Purpose
TBD - created by archiving change refactor-large-ui-modules. Update Purpose after archive.
## Requirements
### Requirement: Stable public facades
The system SHALL preserve existing public module exports and `window.*` handler behavior while large modules are split into focused internals.

#### Scenario: Existing binding imports continue to work
- **WHEN** `src/bindings.js` lazy-loads a refactored feature module
- **THEN** the same exported functions are available with the same call signatures used before the refactor

### Requirement: Focused internal modules
The system SHALL organize large feature implementations into internal modules grouped by responsibility rather than unrelated UI, runtime, parsing, and domain logic in one file.

#### Scenario: Feature code is split by responsibility
- **WHEN** a feature module is refactored
- **THEN** DOM orchestration, runtime setup, pure domain logic, and data conversion are separated where practical without changing visible behavior

### Requirement: Non-blocking code-size audit
The system SHALL provide a code-size audit that reports large JavaScript files using warning thresholds and exits successfully.

#### Scenario: Audit reports large files without failing
- **WHEN** the code-size audit finds JS or MJS files above configured thresholds
- **THEN** it prints warning output and exits with code 0

### Requirement: Safe local artifact cleanup
The system SHALL provide an artifact cleanup command that defaults to dry-run and only deletes allowed ignored local artifact paths when explicitly applied.

#### Scenario: Cleanup dry-run
- **WHEN** the cleanup command runs without `--apply`
- **THEN** it reports candidate files or directories without deleting them

#### Scenario: Cleanup apply
- **WHEN** the cleanup command runs with `--apply`
- **THEN** it deletes only allowed ignored artifact paths inside the repository

