## ADDED Requirements

### Requirement: Stable agent object identity
The system SHALL assign a unique stable agent ID to every agent-addressable scene mesh and group and SHALL use that ID for command targeting rather than display names or collection indexes.

#### Scenario: List two objects with the same name
- **WHEN** two scene objects share the same display name
- **THEN** the command API SHALL return different stable IDs and subsequent commands SHALL target them unambiguously

#### Scenario: Duplicate an object
- **WHEN** an object is duplicated through the command API
- **THEN** the duplicate SHALL receive a new stable ID while the source ID remains unchanged

### Requirement: Semantic command registry
The system SHALL provide an allowlisted registry of semantic read and mutation commands that is independent of HTML handlers and arbitrary DOM access.

#### Scenario: Discover command metadata
- **WHEN** an adapter reads the shared tool catalog
- **THEN** each command SHALL provide a unique name, purpose, strict input schema, safety metadata, and bounded output contract

#### Scenario: Reject an unknown command
- **WHEN** a caller requests a command outside the allowlist
- **THEN** the command API SHALL return a structured `UNKNOWN_COMMAND` error without executing application code

### Requirement: Strict input validation
The command API SHALL validate types, required fields, additional properties, object references, numeric bounds, geometry types, material types, colors, list limits, and payload sizes before execution.

#### Scenario: Reject invalid transform data
- **WHEN** a transform contains a non-finite number, an out-of-range value, or an unexpected property
- **THEN** the command SHALL fail with `VALIDATION_ERROR` and the scene SHALL remain unchanged

#### Scenario: Reject an absent object
- **WHEN** a command references an ID not present in the active scene
- **THEN** the command SHALL fail with `OBJECT_NOT_FOUND` and include the missing ID

### Requirement: Structured bounded results
Every command SHALL return a serializable result envelope with success status, command name, affected IDs, warnings, data, and a compact resulting scene summary; read commands SHALL support limits or detail controls where their output can grow.

#### Scenario: List a large scene
- **WHEN** `list_objects` is called with a limit below the total object count
- **THEN** the response SHALL contain at most that many objects and SHALL indicate truncation and the total count

#### Scenario: Complete a mutation
- **WHEN** a mutation succeeds
- **THEN** its response SHALL identify every changed stable ID and SHALL report the current selection and top-level object count

### Requirement: Atomic undoable mutations
Each agent mutation that changes scene content or editable object properties SHALL be atomic, SHALL synchronize the visible editor state, and SHALL create one undo entry when the existing user workflow supports undo.

#### Scenario: Update transform atomically
- **WHEN** one command changes position, rotation, and scale for an object
- **THEN** one undo operation SHALL restore all three prior values and one redo operation SHALL reapply them

#### Scenario: Delete multiple objects
- **WHEN** a confirmed deletion removes multiple objects
- **THEN** one undo operation SHALL restore every removed object with its stable ID and parent placement

### Requirement: Destructive confirmation at execution boundary
Commands marked destructive SHALL require an explicit confirmation argument and SHALL be rejected at the browser execution boundary when confirmation is absent or false.

#### Scenario: Delete without confirmation
- **WHEN** `delete_objects` is invoked without explicit confirmation
- **THEN** the command SHALL return `CONFIRMATION_REQUIRED` and SHALL not modify the scene

### Requirement: UI synchronization
After a command changes objects, selection, history, or presentation properties, the system SHALL refresh the relevant properties panel, object lists, selected overlay, export state, and cross-domain scene events.

#### Scenario: Select objects through an agent
- **WHEN** `select_objects` changes the current selection
- **THEN** the same selection and property state SHALL be visible as if the user selected those objects through the editor
