## ADDED Requirements

### Requirement: Import JSON object definition
The system SHALL allow importing 3D objects from a JSON definition that uses the same format as the template registry: `{ name, pieces: [{ geometry: { type, params }, color, name, position, rotation?, scale? }] }`.

#### Scenario: Import via paste
- **WHEN** the user opens the import modal and pastes a valid JSON definition and clicks "Importar"
- **THEN** the system SHALL parse the JSON, create a Group with all pieces, add it to userObjects, and select the first piece

#### Scenario: Import via file
- **WHEN** the user clicks "Importar JSON" and selects a .json file containing a valid object definition
- **THEN** the system SHALL read the file, parse it, and create the object in the scene

### Requirement: JSON validation on import
The system SHALL validate the JSON before building the object. It SHALL check that `pieces` is an array and each piece has `geometry.type` matching a supported type (cube, sphere, cylinder, cone, plane, capsule, torus).

#### Scenario: Invalid JSON
- **WHEN** the user pastes malformed JSON
- **THEN** the system SHALL display an error message "JSON invalido" and not modify the scene

#### Scenario: Missing required fields
- **WHEN** the JSON is valid but a piece is missing `geometry.type`
- **THEN** the system SHALL display an error message indicating which piece has the issue

### Requirement: Default values for optional fields
The system SHALL apply sensible defaults for optional fields: position defaults to [0,0,0], rotation to [0,0,0], scale to [1,1,1], color to '#ffcc00', name to 'PIECE_N'.

#### Scenario: Piece with minimal definition
- **WHEN** a piece only specifies `{ geometry: { type: "cube" } }`
- **THEN** the system SHALL create a cube at origin with default color, default scale, and auto-generated name

### Requirement: Import modal UI
The system SHALL provide an import modal accessible from a button in the left panel or top bar. The modal SHALL contain a textarea for pasting JSON, a file upload button, and Import/Cancel buttons.

#### Scenario: Open import modal
- **WHEN** the user clicks the "IMPORTAR OBJETO" button
- **THEN** a modal overlay SHALL appear with a textarea, file upload, and action buttons

#### Scenario: Close modal
- **WHEN** the user clicks "Cancelar" or presses Escape
- **THEN** the modal SHALL close without changes

### Requirement: ask.md prompt file
The project SHALL include an `ask.md` file at the root with a ready-to-copy prompt for asking external LLMs to generate object JSON definitions. The prompt SHALL include the schema, supported geometry types with their params, a complete example, and instructions to return only JSON.

#### Scenario: ask.md exists and is complete
- **WHEN** a user reads ask.md
- **THEN** they SHALL find a prompt they can copy-paste directly into Grok, Perplexity, ChatGPT, or Claude to generate a valid object definition
