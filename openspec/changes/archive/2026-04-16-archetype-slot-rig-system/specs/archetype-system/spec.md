## ADDED Requirements

### Requirement: Archetype registry defines available slot sets
The system SHALL maintain a static registry of archetypes. Each archetype SHALL define a unique identifier (string) and an ordered list of available `SlotId` values.

The initial archetypes SHALL be:
- `HUMANOID`: HEAD, TORSO, ARM_L, ARM_R, LEG_L, LEG_R, WEAPON_MAIN, WEAPON_SECONDARY
- `BIRD`: BODY, HEAD, LEG_L, LEG_R, WING_L, WING_R, TAIL
- `CAR`: BODY, WHEEL_FL, WHEEL_FR, WHEEL_RL, WHEEL_RR
- `PROP`: BODY

#### Scenario: Query available slots for HUMANOID
- **WHEN** the system queries archetype "HUMANOID" for its available slots
- **THEN** it SHALL return `[HEAD, TORSO, ARM_L, ARM_R, LEG_L, LEG_R, WEAPON_MAIN, WEAPON_SECONDARY]`

#### Scenario: Query available slots for CAR
- **WHEN** the system queries archetype "CAR" for its available slots
- **THEN** it SHALL return `[BODY, WHEEL_FL, WHEEL_FR, WHEEL_RL, WHEEL_RR]`

#### Scenario: Query unknown archetype
- **WHEN** the system queries an archetype that is not registered
- **THEN** it SHALL return null or an empty slot list

### Requirement: Archetype registry is extensible
The archetype registry SHALL expose a function to register new archetypes at runtime, allowing future extensions without modifying the core module.

#### Scenario: Register custom archetype
- **WHEN** a new archetype "MECH" is registered with slots `[BODY, ARM_L, ARM_R, LEG_L, LEG_R, TURRET]`
- **THEN** querying archetype "MECH" SHALL return those slots

### Requirement: SlotId is a finite union type
The system SHALL define a set of known SlotId values. Slots used in a model MUST be from the set defined by its archetype.

#### Scenario: Validate slot against archetype
- **WHEN** a CharacterModel has archetype "HUMANOID" and includes a slot with slotId "WING_L"
- **THEN** validation SHALL report an error because WING_L is not a valid HUMANOID slot
