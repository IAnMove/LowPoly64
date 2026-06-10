## MODIFIED Requirements

### Requirement: Load scene from localStorage
The system SHALL recover safely from invalid or incompatible saved scene JSON in `localStorage`. If parsing or validation fails, it SHALL keep the current scene intact and notify the user with a readable error.

#### Scenario: Corrupt localStorage scene
- **WHEN** the stored scene JSON is malformed or does not match the expected shape
- **THEN** the system SHALL refuse to load it, preserve the current scene, and show an error message

### Requirement: Import scene JSON from file
The system SHALL validate imported scene JSON files before deserializing them. Invalid files SHALL produce a user-facing error instead of breaking the application.

#### Scenario: Invalid scene JSON file
- **WHEN** the user selects a malformed or incompatible scene JSON file
- **THEN** the system SHALL display an import error and SHALL NOT replace the current scene
