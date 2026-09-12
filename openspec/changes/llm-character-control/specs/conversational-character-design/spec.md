## ADDED Requirements

### Requirement: Complete tool artifacts

The system SHALL preserve valid PNG and model JSON artifacts byte-for-byte through success results and the companion, and SHALL reject oversized artifacts explicitly. Provider observations SHALL distinguish complete artifacts from summaries.

#### Scenario: Large viewport image and deep JSON
- **WHEN** a tool returns a valid image longer than 2000 characters or a model containing more than 100 array items
- **THEN** clients receive a decodable complete image or importable complete model without ellipses or depth markers

### Requirement: Validated semantic character operations

The shared panel and MCP registry SHALL expose capabilities, searchable examples, recipe inspection/validation, design creation and bounded part edits using the existing generators.

#### Scenario: Original swordsman
- **WHEN** a caller builds a PSX swordsman, adds a broad sword and reduces its head
- **THEN** the sword remains attached to the hand, the rig remains valid, and unrelated body edits and stable IDs survive

#### Scenario: Invalid preset or parameter
- **WHEN** a caller supplies an unknown style or out-of-range parameter
- **THEN** validation identifies the precise field and supported values without changing the scene

### Requirement: Isolated reversible visual review

The system SHALL keep drafts separate from the scene, render three requested views, expose structural diagnostics, bound corrections, support selecting a previous revision and commit once with undo/redo. Mutations SHALL enforce expected revisions and idempotent operation IDs.

#### Scenario: Retry and conflict
- **WHEN** the same operation is retried or the source is manually edited before commit
- **THEN** the retry does not duplicate geometry and a stale source is rejected without overwriting manual work

#### Scenario: Commit and undo
- **WHEN** a reviewed draft is committed and subsequently undone
- **THEN** the complete previous character is restored in one history operation

### Requirement: Reopen and export the actual character

The system SHALL export JSON and GLB from the actual draft or committed object, and SHALL persist semantic recipes alongside actual edited geometry for later revisions.

#### Scenario: Save and reopen
- **WHEN** the demonstrated swordsman is exported, reimported and edited again
- **THEN** geometry, equipment anchors, recipe and supported animation data remain usable

### Requirement: Explicit provider capability negotiation

The system SHALL support local Ollama and LM Studio alongside configured API providers, probe model-specific tool/image/structured-output support, keep credentials on the companion and never silently fall back from local to cloud.

#### Scenario: Local model without vision
- **WHEN** a local model passes tool calling but fails image support
- **THEN** editing tools remain available and visual review is explicitly delegated to the user

#### Scenario: Local endpoint unavailable
- **WHEN** a local service cannot be reached
- **THEN** the UI reports the failed connection without invoking another provider
