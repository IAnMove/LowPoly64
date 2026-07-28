## ADDED Requirements

### Requirement: Atomic PNG-model actions
Creating a PNG-derived model SHALL register one undo action, and regenerating an existing PNG-derived model SHALL register one undo action containing complete before and after snapshots. Undo and redo SHALL refresh selection, object-list, properties, and scene-change listeners.

#### Scenario: Undo PNG-model insertion
- **WHEN** the user inserts a generated PNG model and invokes undo
- **THEN** the entire derived group SHALL be removed as one action and redo SHALL restore it

#### Scenario: Undo PNG-model regeneration
- **WHEN** the user edits depth settings or the manual map of an existing PNG-derived group and accepts the update
- **THEN** one undo SHALL restore the complete previous geometry, material state, texture, and editable recipe
