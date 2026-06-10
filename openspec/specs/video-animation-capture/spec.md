# video-animation-capture Specification

## Purpose
TBD - created by archiving change normalize-humanoid-video-animation-pipeline. Update Purpose after archive.
## Requirements
### Requirement: Video capture produces standard humanoid animation assets
The system SHALL convert video-derived humanoid motion into a standard humanoid animation representation compatible with Fast Poser/Animateur naming.

#### Scenario: Export captured take as standard animation
- **WHEN** a user records a valid humanoid motion take from video
- **THEN** the exported animation SHALL include `format: "fast-poser-asset"`, `version: 1`, `type: "animation"`, and keyframes using standard humanoid bone names such as `Hips`, `Spine`, `Left_Shoulder`, and `Left_Upper_Arm`

#### Scenario: Import captured standard animation onto legacy humanoid
- **WHEN** a standard video-captured animation is imported onto a legacy humanoid template
- **THEN** the animation SHALL resolve onto the legacy template through aliases and create playable clips

### Requirement: Captured rotations retarget from rest pose
The system SHALL apply captured humanoid rotations as deltas from the capture reference pose onto the target model rest pose.

#### Scenario: Retarget rotation without overwriting rest pose
- **WHEN** a captured shoulder or limb rotation is applied to a target humanoid
- **THEN** the resulting track SHALL preserve the target bone's rest orientation and apply only the captured rotation delta

#### Scenario: Explicit neutral pose remains meaningful
- **WHEN** a user provides or records a neutral reference pose before capture
- **THEN** the first animation frame SHALL NOT be forced to identity if the neutral reference indicates a non-zero delta

### Requirement: Captured child bone positions do not stretch target models
The system SHALL preserve target rest positions for non-root humanoid bones when importing video-derived animation.

#### Scenario: Ignore non-root position tracks
- **WHEN** a captured animation includes position tracks for child bones
- **THEN** the importer SHALL ignore those child position tracks and keep the target model's rest positions

#### Scenario: Preserve root motion
- **WHEN** a captured animation includes root or hips motion
- **THEN** the importer SHALL apply root motion relative to the target model and configured facing direction

### Requirement: Generated capture characters use stable human proportions
The system SHALL generate video-created humanoid characters using stable standard proportions rather than raw landmark widths.

#### Scenario: Generate proportionate skinned capture character
- **WHEN** a user creates a humanoid character from a video capture
- **THEN** the generated skinned character SHALL have torso width, head size, limb thickness, and total height within the standard humanoid proportion range

#### Scenario: Side-view capture remains usable
- **WHEN** a capture source has a side-on or narrow landmark silhouette
- **THEN** the generated humanoid SHALL still have non-flat shoulders, torso, hips, arms, and legs

### Requirement: Capture quality controls suppress unreliable motion
The system SHALL suppress unreliable captured joints and preserve usable animation on the remaining body.

#### Scenario: Half-body capture suppresses lower body
- **WHEN** the capture analysis detects a half-body take with unreliable lower-body landmarks
- **THEN** lower-body rotation tracks SHALL be omitted or held at rest while upper-body and root motion remain importable

#### Scenario: Low-confidence joints do not create noisy tracks
- **WHEN** a joint remains below its confidence threshold across the take
- **THEN** the exported animation SHALL NOT include a rotation track for that joint

