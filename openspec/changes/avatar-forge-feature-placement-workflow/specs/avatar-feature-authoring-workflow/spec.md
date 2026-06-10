## ADDED Requirements

### Requirement: Author one feature family at a time
The system SHALL support an Avatar Forge authoring workflow where maintainers work through one feature family at a time, starting with a single base preset before generating variants. The recommended first family SHALL be `eyes`.

#### Scenario: Start with eyes
- **WHEN** maintainers begin the feature placement workflow without an approved base family
- **THEN** the workflow SHALL select one eyes preset on the canonical mold as the first placement target

#### Scenario: Block premature variants
- **WHEN** a feature family's base preset has not been validated
- **THEN** maintainers SHALL NOT add generated variants for that feature family as validated catalog entries

### Requirement: Validate the base preset with metrics and live screenshots
The system SHALL require validation evidence for a feature-family base preset before it becomes the source for variants. Evidence SHALL include geometry metrics and a live Avatar Forge screenshot capture.

#### Scenario: Capture base preset evidence
- **WHEN** the first eyes preset is adjusted for placement
- **THEN** the workflow SHALL record bounds or placement diagnostics and a live preview screenshot before marking the base preset approved

#### Scenario: Detect measurable placement drift
- **WHEN** a feature is centered, scaled, spaced, or placed on the wrong frontal side outside the accepted range
- **THEN** the workflow SHALL fail validation before asking for style approval

### Requirement: Generate variants from approved baselines
The system SHALL derive feature variants from an approved base preset's anchors, scale rules, and metadata rather than solving each variant from scratch.

#### Scenario: Generate a variant batch
- **WHEN** an eyes base preset is approved
- **THEN** newly generated eyes variants SHALL inherit the approved placement model and only vary authored shape, style, or color intent

#### Scenario: Reuse validation for variants
- **WHEN** generated variants are added to the catalog
- **THEN** each variant SHALL run through the same geometry and screenshot validation used for the base preset

### Requirement: Gate human intervention explicitly
The workflow SHALL identify the exact points where human review is required and SHALL allow measurable placement work to proceed without manual input.

#### Scenario: Request human approval for a base preset
- **WHEN** automated checks pass for the first base preset in a feature family
- **THEN** the workflow SHALL request human approval for visual quality before generating variants

#### Scenario: Continue without human review for deterministic adjustments
- **WHEN** a feature can be moved, scaled, or spaced to match an already approved target range
- **THEN** the workflow SHALL allow the agent to apply and verify that adjustment without asking for approval

### Requirement: Preserve feature identity through SVG roundtrip
The system SHALL support a later workflow phase where an Avatar Forge feature or complement can be exported as SVG and imported back while preserving role, mount target, and editable source metadata.

#### Scenario: Export a feature as SVG
- **WHEN** a maintained feature is exported for external editing
- **THEN** the exported SVG SHALL include metadata for its feature role, mount target, viewBox, and source identity

#### Scenario: Import an edited feature SVG
- **WHEN** an edited SVG is imported back into Avatar Forge
- **THEN** the system SHALL preserve the feature role and mount metadata so it can be validated against the same placement workflow
