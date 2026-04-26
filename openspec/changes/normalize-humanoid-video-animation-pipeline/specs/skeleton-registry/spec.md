## ADDED Requirements

### Requirement: Standard humanoid skeleton is available
The system SHALL include a `HUMANOID_STANDARD` skeleton that uses the standard Fast Poser/Animateur humanoid bone contract.

#### Scenario: Load standard humanoid skeleton
- **WHEN** the skeleton registry is queried for `HUMANOID_STANDARD`
- **THEN** it SHALL return a humanoid skeleton with standard bones including `Hips`, `Spine`, `Neck`, `Head`, `Left_Shoulder`, `Left_Upper_Arm`, `Left_Lower_Arm`, `Left_Hand`, `Right_Shoulder`, `Right_Upper_Arm`, `Right_Lower_Arm`, `Right_Hand`, `Left_Upper_Leg`, `Left_Lower_Leg`, `Left_Foot`, `Right_Upper_Leg`, `Right_Lower_Leg`, and `Right_Foot`

#### Scenario: Standard skeleton has humanoid bindings
- **WHEN** `HUMANOID_STANDARD` is loaded
- **THEN** its default bindings SHALL map humanoid slots for head, torso, arms, legs, and weapon hands to standard bone names

### Requirement: Humanoid skeleton aliases bridge standard and legacy names
The system SHALL provide a single alias/canonical-name layer that maps standard humanoid bone names to legacy editor and capture bone names.

#### Scenario: Resolve standard bone to legacy template node
- **WHEN** an animation references `Left_Upper_Arm` and the selected template exposes `ARM_L_UPPER` or `LEFT_ARM_UPPER`
- **THEN** the animation target resolver SHALL map the standard bone to the compatible legacy node

#### Scenario: Resolve legacy bone to standard template node
- **WHEN** an animation references `ARM_R_UPPER` and the selected template exposes `Right_Upper_Arm`
- **THEN** the animation target resolver SHALL map the legacy bone to the compatible standard node

### Requirement: Legacy humanoid skeletons remain loadable during migration
The system SHALL keep `HUMANOID_DEFAULT` and `HUMANOID_CAPTURE` loadable while standard skeleton adoption is in progress.

#### Scenario: Load legacy default skeleton
- **WHEN** the skeleton registry is queried for `HUMANOID_DEFAULT`
- **THEN** it SHALL continue returning the legacy humanoid skeleton

#### Scenario: Load capture compatibility skeleton
- **WHEN** a saved capture-generated model references `HUMANOID_CAPTURE`
- **THEN** the system SHALL load the capture skeleton or compatibility adapter instead of rejecting the model
