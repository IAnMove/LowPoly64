## ADDED Requirements

### Requirement: Animation profile definition
An animation profile SHALL be a JSON object with:
- `id` (string, required): Unique identifier (e.g., "HUMANOID_SWORDSMAN", "BIRD_IDLE_WALK").
- `skeletonId` (string, required): The skeleton this profile is designed for.
- `animations` (string[], required): List of animation names from the skeleton to include in this profile.
- `style` (object, optional): Default style parameters (e.g., `walkSpeed`, `armSwing`, `headBob`) — numeric values only.

#### Scenario: Load HUMANOID_SWORDSMAN profile
- **WHEN** the system loads the "HUMANOID_SWORDSMAN" animation profile
- **THEN** it SHALL reference skeleton "HUMANOID_DEFAULT" and include animations like ["idle", "walk", "run", "attack", "hurt", "die"]

#### Scenario: Load HUMANOID_ARCHER profile
- **WHEN** the system loads the "HUMANOID_ARCHER" animation profile
- **THEN** it SHALL reference skeleton "HUMANOID_DEFAULT" and include animations like ["idle", "walk", "run", "bow_draw", "bow_shoot", "hurt", "die"]

### Requirement: Animation profile registry
The system SHALL load animation profiles from `src/data/animation-profiles/` using `import.meta.glob` and maintain a queryable registry.

#### Scenario: List profiles for a skeleton
- **WHEN** the registry is queried for profiles compatible with skeleton "HUMANOID_DEFAULT"
- **THEN** it SHALL return all profiles that have `skeletonId: "HUMANOID_DEFAULT"` (e.g., HUMANOID_SWORDSMAN, HUMANOID_ARCHER)

#### Scenario: Get profile by ID
- **WHEN** the registry is queried for profile "CAR_ROLL"
- **THEN** it SHALL return the full profile definition

### Requirement: Profile resolves to animation clips
When a CharacterModel with an `animationProfile` is loaded, the system SHALL:
1. Look up the profile in the registry.
2. Look up the referenced skeleton.
3. Filter the skeleton's animations to only those listed in the profile.
4. Compile those animations and attach them to the model group.

#### Scenario: Apply HUMANOID_SWORDSMAN profile to a model
- **WHEN** a CharacterModel with `animationProfile: "HUMANOID_SWORDSMAN"` is loaded
- **THEN** only the animations listed in the HUMANOID_SWORDSMAN profile SHALL be compiled and attached to the group as `animationClips`

### Requirement: Style parameters adjust animation intensity
When a CharacterModel provides a `style` object, those numeric values SHALL be available to the animation system as multipliers or overrides. The initial supported style parameters are:
- `walkSpeed` (number): Multiplier for walk/run animation speed.
- `armSwing` (number): Multiplier for arm rotation range.
- `headBob` (number): Multiplier for head movement amplitude.

#### Scenario: Style walkSpeed doubles animation speed
- **WHEN** a CharacterModel has `style: { walkSpeed: 2.0 }` and the "walk" animation is played
- **THEN** the animation timeScale SHALL be multiplied by 2.0
