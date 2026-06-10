## ADDED Requirements

### Requirement: Derive new feature variants from validated base presets
The system SHALL treat new Avatar Forge feature and complement variants as derivatives of a validated base preset for their feature family. Each derived preset SHALL retain enough metadata to identify its source family, validation state, rollout pass, and placement assumptions.

#### Scenario: Review variant metadata
- **WHEN** maintainers inspect a generated eyes, brows, nose, mouth, ears, hair, or accessory preset
- **THEN** the preset SHALL identify the family it belongs to and SHALL expose validation metadata that distinguishes planned, generated, and validated states

#### Scenario: Prevent unvalidated catalog expansion
- **WHEN** a generated preset lacks evidence from the feature authoring workflow
- **THEN** the preset SHALL NOT be marked as validated in the style library
