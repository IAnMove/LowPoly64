## Purpose
Define the archetype registry and the slot sets used by CharacterModel assets and rig workflows.

## Requirements

### Requirement: Archetype registry defines available slot sets
The system SHALL maintain a static registry of archetypes. Each archetype SHALL define a unique identifier and an ordered list of valid slot ids.

The initial archetypes SHALL include:
- `HUMANOID`: `HEAD`, `TORSO`, `ARM_L`, `ARM_R`, `LEG_L`, `LEG_R`, `WEAPON_MAIN`, `WEAPON_SECONDARY`
- `BIRD`: `BODY`, `HEAD`, `LEG_L`, `LEG_R`, `WING_L`, `WING_R`, `TAIL`
- `CAR`: `BODY`, `WHEEL_FL`, `WHEEL_FR`, `WHEEL_RL`, `WHEEL_RR`
- `PROP`: `BODY`

#### Scenario: Query available slots for HUMANOID
- **WHEN** the system queries the `HUMANOID` archetype
- **THEN** it SHALL return the humanoid slot list in registry order

#### Scenario: Query unknown archetype
- **WHEN** the system queries an unregistered archetype
- **THEN** it SHALL return `null` or an empty slot list

### Requirement: Archetype registry is extensible
The archetype registry SHALL expose a runtime registration mechanism for future archetypes.

#### Scenario: Register custom archetype
- **WHEN** a new archetype `MECH` is registered with its slot list
- **THEN** future queries for `MECH` SHALL return that slot list

### Requirement: Slot ids are validated against archetype
The system SHALL reject slot ids that are not part of the selected archetype.

#### Scenario: Validate slot against archetype
- **WHEN** a CharacterModel has archetype `HUMANOID` and includes slot `WING_L`
- **THEN** validation SHALL report that `WING_L` is not valid for `HUMANOID`
