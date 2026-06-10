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

### Requirement: Rig UI imports standard humanoid animation assets
The rig and animation UI SHALL import Fast Poser/Animateur humanoid animation assets onto compatible standard or legacy humanoid models.

#### Scenario: Import standard animation onto standard humanoid
- **WHEN** a user imports a `fast-poser-asset` animation that targets standard humanoid bones
- **THEN** the rig UI SHALL create playable tracks for a selected `HUMANOID_STANDARD` model

#### Scenario: Import standard animation onto legacy humanoid
- **WHEN** a user imports a `fast-poser-asset` animation that targets standard humanoid bones onto a legacy humanoid model
- **THEN** the rig UI SHALL resolve compatible target nodes through humanoid aliases and create playable tracks

### Requirement: Rig UI exports playable humanoid clips as standard assets
The rig and animation UI SHALL export playable humanoid clips using the standard Fast Poser/Animateur interchange contract.

#### Scenario: Export rig clip as Fast Poser asset
- **WHEN** a user exports a playable humanoid animation clip from the rig UI
- **THEN** the exported asset SHALL include `format: "fast-poser-asset"`, `version: 1`, `type: "animation"`, and standard humanoid bone names

#### Scenario: Export preserves character index suffixes
- **WHEN** a clip contains tracks for one humanoid character
- **THEN** exported track names SHALL include the character index suffix expected by the Fast Poser/Animateur importer

### Requirement: Rig playback remains correct after alias resolution
The rig and animation UI SHALL preview and play animations correctly after resolving standard and legacy humanoid aliases.

#### Scenario: Preview standard clip on legacy template
- **WHEN** a standard humanoid clip is loaded on a legacy humanoid template
- **THEN** the model viewport and skeleton viewport SHALL animate matching body parts without missing compatible limb, torso, head, or hand tracks

#### Scenario: Preserve rest positions during playback
- **WHEN** an imported humanoid animation omits or ignores non-root child position tracks
- **THEN** rig playback SHALL keep child bones at their target rest positions while applying rotation and root motion tracks

### Requirement: Video animation imports expose usable errors and preview state
The rig and animation UI SHALL surface clear preview and error states for video-derived humanoid animation imports.

#### Scenario: Imported video animation has no compatible tracks
- **WHEN** a video-derived animation is imported onto a selected model and no compatible humanoid targets can be resolved
- **THEN** the UI SHALL report that the animation cannot be mapped instead of creating an empty playable clip

#### Scenario: Imported video animation is partially compatible
- **WHEN** a video-derived animation resolves only part of the humanoid body
- **THEN** the UI SHALL keep the compatible tracks playable and identify that the import was partial

