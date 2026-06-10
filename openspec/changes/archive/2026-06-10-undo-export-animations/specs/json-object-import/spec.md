## ADDED Requirements

### Requirement: Optional animations field in object JSON
The system SHALL accept an optional `animations` array in the object import JSON. Each animation entry SHALL follow the animation definition format (name, duration, loop, tracks with keyframes). When present, animations SHALL be compiled and attached to the created group.

#### Scenario: Import with animations
- **WHEN** user imports `{ "name": "X", "pieces": [...], "animations": [{ "name": "spin", ... }] }`
- **THEN** the group is created with pieces and the "spin" animation is compiled and playable

#### Scenario: Import without animations
- **WHEN** user imports `{ "name": "X", "pieces": [...] }` without animations field
- **THEN** the group is created normally with no animations (backward compatible)

#### Scenario: Invalid animation in import
- **WHEN** user imports an object where one animation has invalid tracks
- **THEN** the object is created successfully but the invalid animation is skipped with a warning toast
