## Purpose
Define animation profile data and how CharacterModel assets resolve skeleton clips through those profiles.

## Requirements

### Requirement: Animation profile definition
An animation profile SHALL be a JSON object with:
- `id` (string, required): unique identifier
- `skeletonId` (string, required): skeleton the profile targets
- `animations` (string[], required): list of skeleton animation names to expose
- `style` (object, optional): numeric style overrides such as `walkSpeed`, `armSwing`, or `headBob`

#### Scenario: Load HUMANOID_SWORDSMAN profile
- **WHEN** the system loads `HUMANOID_SWORDSMAN`
- **THEN** it SHALL reference `HUMANOID_DEFAULT` and include clips such as `idle`, `walk`, `run`, `attack`, `hurt`, and `die`

### Requirement: Animation profile registry
The system SHALL load animation profiles from `src/data/animation-profiles/` and expose a queryable registry by id, skeleton, and archetype.

#### Scenario: List profiles for a skeleton
- **WHEN** the registry is queried for profiles compatible with `HUMANOID_DEFAULT`
- **THEN** it SHALL return all profiles that reference that skeleton

#### Scenario: Get profile by ID
- **WHEN** the registry is queried for `CAR_ROLL`
- **THEN** it SHALL return the full profile definition

### Requirement: Profile resolves to animation clips
When a CharacterModel with an `animationProfile` is loaded, the system SHALL resolve the profile, load the referenced skeleton, filter that skeleton to the profile's animation names, and attach only those clips to the model group.

#### Scenario: Apply HUMANOID_SWORDSMAN profile to a model
- **WHEN** a CharacterModel with `animationProfile: "HUMANOID_SWORDSMAN"` is loaded
- **THEN** only the clips listed by that profile SHALL be compiled and attached to the group

### Requirement: Style parameters adjust animation intensity
When a CharacterModel provides a `style` object, those numeric values SHALL be available to the animation system as multipliers or overrides.

#### Scenario: Style walkSpeed doubles animation speed
- **WHEN** a CharacterModel has `style: { walkSpeed: 2.0 }` and the `walk` animation is played
- **THEN** the animation speed SHALL be multiplied by `2.0`
