## ADDED Requirements

### Requirement: Comparable speech renderers
The system SHALL provide SVG pose, 2D cutout and volumetric jaw mouth prototypes driven by the same normalized speech frames.

#### Scenario: Audio and silence
- **WHEN** local audio is analyzed and played
- **THEN** each mouth opens in response to the signal and returns to rest during silence.

### Requirement: Explicit viseme cues
The system SHALL accept validated timed viseme JSON and distinguish authored visemes from amplitude-only animation.

#### Scenario: Known vowel sequence
- **WHEN** a user plays the supplied vowel demonstration or scrubs its timeline
- **THEN** the visible pose follows its explicit timed cue and remains synchronized with the playback clock.

### Requirement: User-controlled audio and portable demonstrations
The system SHALL start playback or microphone capture only after an explicit UI action and SHALL export baked speech examples as GLB plus cue JSON.

#### Scenario: Open and export
- **WHEN** the laboratory opens
- **THEN** it remains silent, offers a playable local demonstration and can save animated samples whose mouth movement survives GLB reimport.
