## ADDED Requirements

### Requirement: Persist stable agent object IDs
Scene serialization SHALL include the optional stable agent ID for every serialized agent-addressable mesh, group, pivot, avatar group, and supported specialized group, and deserialization SHALL restore valid non-conflicting IDs.

#### Scenario: Save and load agent-addressed objects
- **WHEN** a scene is saved after an agent has addressed its objects and is then loaded
- **THEN** every restored object SHALL retain the same stable agent ID

#### Scenario: Load a legacy scene without agent IDs
- **WHEN** an existing scene JSON contains no agent ID fields
- **THEN** the scene SHALL load as before and the system SHALL assign stable IDs lazily or during post-load normalization

#### Scenario: Resolve duplicate serialized IDs
- **WHEN** imported or manually edited scene data contains the same agent ID on multiple objects
- **THEN** the first valid occurrence MAY be preserved but every collision SHALL receive a new unique ID before agent commands execute

#### Scenario: Duplicate an object after load
- **WHEN** a restored object is duplicated
- **THEN** the duplicate SHALL not inherit the source agent ID
