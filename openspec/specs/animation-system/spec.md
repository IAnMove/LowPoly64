# animation-system Specification

## Purpose
TBD - created by archiving change undo-export-animations. Update Purpose after archive.
## Requirements
### Requirement: Animation definition format
The system SHALL support animations defined as JSON objects with the structure: `{ name, duration, loop, tracks: [{ target, property, keyframes: [{ time, value }] }] }`. The `property` field SHALL accept "position", "rotation", and "scale". Values for position and scale SHALL be `[x, y, z]` arrays. Values for rotation SHALL be `[rx, ry, rz]` in radians (euler angles converted internally to quaternions).

#### Scenario: Valid animation definition
- **WHEN** an animation JSON has name "idle", duration 2.0, loop true, and tracks targeting "HEAD" with property "rotation"
- **THEN** the system accepts the definition and compiles it to a Three.js AnimationClip

### Requirement: Animation compilation to AnimationClip
The system SHALL compile animation JSON definitions to Three.js AnimationClip objects using VectorKeyframeTrack for position/scale and QuaternionKeyframeTrack for rotation. Track names SHALL follow the pattern `objectName.property` to match Three.js conventions.

#### Scenario: Rotation track compilation
- **WHEN** a track has property "rotation" with euler keyframes
- **THEN** each euler [rx, ry, rz] value is converted to a quaternion [x, y, z, w] for the QuaternionKeyframeTrack

### Requirement: Animation playback with AnimationMixer
The system SHALL use Three.js AnimationMixer to play animations on selected groups/objects. The render loop SHALL update the mixer on each frame using a Clock delta. The user SHALL be able to play, pause, and stop the animation.

#### Scenario: Play animation
- **WHEN** user selects a group with animations and presses Play
- **THEN** the AnimationMixer plays the first animation clip, objects animate in real-time

#### Scenario: Pause and resume
- **WHEN** user pauses a playing animation and presses Play again
- **THEN** the animation resumes from where it was paused

#### Scenario: Stop animation
- **WHEN** user stops a playing animation
- **THEN** all animated objects return to their original transforms (time reset to 0)

### Requirement: Animation storage on objects
The system SHALL store animation definitions in `group.userData.animations` (JSON array) and compiled clips in `group.userData.animationClips` (AnimationClip array). This data SHALL persist through serialization/deserialization.

#### Scenario: Animation survives save/load
- **WHEN** a group with animations is saved to localStorage and loaded back
- **THEN** the animation definitions are preserved and clips can be recompiled

### Requirement: Timeline UI
The system SHALL display a timeline bar in the viewport when a selected object has animations. The timeline SHALL show: animation name, play/pause button, stop button, and a progress bar showing current time / total duration.

#### Scenario: Timeline visibility
- **WHEN** user selects a group with animations
- **THEN** the timeline bar appears at the bottom of the viewport

#### Scenario: Timeline hidden
- **WHEN** user selects an object without animations or deselects all
- **THEN** the timeline bar is hidden

### Requirement: Multiple animations per object
The system SHALL support multiple animation definitions per object. The timeline SHALL allow selecting which animation to play via a dropdown or buttons.

#### Scenario: Switch animation
- **WHEN** a group has animations "idle" and "walk" and user selects "walk"
- **THEN** the currently playing animation stops and "walk" starts playing

