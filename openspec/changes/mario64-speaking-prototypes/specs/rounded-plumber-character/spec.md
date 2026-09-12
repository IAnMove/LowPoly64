## ADDED Requirements

### Requirement: Reproducible rounded character
The system SHALL create a rounded N64 plumber through a compact recipe, with overalls, gloves, shoes, a cap, nose, moustache and expressive eyes on the existing humanoid rig.

#### Scenario: Generate and reopen
- **WHEN** the plumber recipe is generated and exported to JSON and GLB
- **THEN** it can be reimported with its geometry, recipe, material appearance and rig intact.

### Requirement: Preserve the PSX hero
The system SHALL retain the existing authored Cloud recipe and its generated geometry.

#### Scenario: Independent profiles
- **WHEN** the new plumber profiles are introduced
- **THEN** the existing Cloud recipe continues to produce its previous character and a saved copy is included with the delivery.
