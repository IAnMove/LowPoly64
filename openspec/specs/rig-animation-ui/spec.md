## Purpose
Define the rig and animation panel used by CharacterModel groups for slot binding, skeleton inspection, and playback.

## Requirements

### Requirement: Rig and animation panel accessible from properties
The system SHALL expose a `Rig / Animaciones` action in the properties panel for groups that carry `userData.archetype`.

#### Scenario: Button visible for CharacterModel group
- **WHEN** a CharacterModel-derived group is selected
- **THEN** the `Rig / Animaciones` button SHALL appear in the properties panel

#### Scenario: Button hidden for plain group
- **WHEN** a group without archetype metadata is selected
- **THEN** the `Rig / Animaciones` button SHALL NOT appear

### Requirement: Rig panel dual viewport layout
The rig panel SHALL open as a modal with two simultaneous 3D viewports: model on the left and skeleton on the right, each with independent camera controls.

#### Scenario: Open rig panel
- **WHEN** the user opens the rig panel
- **THEN** the modal SHALL show both the model viewport and the skeleton viewport

#### Scenario: Close rig panel
- **WHEN** the user closes the rig panel
- **THEN** the modal SHALL close and both auxiliary renderers SHALL be disposed

### Requirement: Slot and bone binding workflow
The rig panel SHALL expose the compatible skeleton selector, slot-to-bone binding UI, and visual highlights for the selected slot and bone.

#### Scenario: View default bindings
- **WHEN** the rig panel is opened with a compatible skeleton selected
- **THEN** the binding UI SHALL show the skeleton default bindings for each slot

#### Scenario: Highlight selected slot and bone
- **WHEN** the user selects slot `ARM_R` and bone `HAND_R`
- **THEN** the slot pieces SHALL be highlighted in the left viewport and the chosen bone SHALL be highlighted in the right viewport

### Requirement: Animation playback stays synchronized
The rig panel SHALL play animations on both viewports in sync, and selected slot or bone highlights SHALL continue following the animated positions during playback.

#### Scenario: Play idle animation
- **WHEN** the user plays `idle`
- **THEN** the model viewport and skeleton viewport SHALL animate in sync

#### Scenario: Highlight follows animation
- **WHEN** slot `ARM_R` is selected and `attack` is playing
- **THEN** the highlight on `ARM_R` pieces and their bound bones SHALL move with the animation

### Requirement: Main viewport bone overlay remains unchanged
The existing cyan bone overlay in the main scene viewport SHALL continue to work independently of the rig panel.

#### Scenario: Toggle bones in main viewport
- **WHEN** the user toggles the main viewport bone overlay
- **THEN** it SHALL behave as before regardless of the rig panel state
