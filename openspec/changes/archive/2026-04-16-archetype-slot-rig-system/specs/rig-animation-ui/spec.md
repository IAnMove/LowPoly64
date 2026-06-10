## ADDED Requirements

### Requirement: Rig/Animation panel accessible from properties
The system SHALL add a button "Rig / Animaciones" to the properties panel. This button SHALL be visible only when the selected object is a group with `userData.archetype` set.

#### Scenario: Button visible for CharacterModel group
- **WHEN** a group loaded from a CharacterModel with archetype "HUMANOID" is selected
- **THEN** the "Rig / Animaciones" button SHALL appear in the properties panel

#### Scenario: Button hidden for plain group
- **WHEN** a group without archetype metadata is selected
- **THEN** the "Rig / Animaciones" button SHALL NOT appear

### Requirement: Rig panel dual viewport layout
The Rig/Animation panel SHALL open as a modal overlay with:
- **Left viewport**: 3D view of the model (geometric pieces/slots) with independent camera controls.
- **Right viewport**: 3D view of the skeleton (bones as spheres + connecting lines) with independent camera controls.
- Both viewports SHALL render simultaneously and can be rotated independently.

#### Scenario: Open rig panel
- **WHEN** the user clicks the "Rig / Animaciones" button
- **THEN** a modal SHALL open with two side-by-side 3D viewports showing the model (left) and skeleton (right)

#### Scenario: Close rig panel
- **WHEN** the user clicks the close button on the rig panel
- **THEN** the modal SHALL close and the Two additional renderers SHALL be disposed to free resources

### Requirement: Skeleton selector based on archetype
The rig panel SHALL display a dropdown selector for `skeletonId`. The options SHALL be filtered to only show skeletons compatible with the model's archetype.

#### Scenario: Skeleton options for HUMANOID
- **WHEN** the rig panel is opened for a HUMANOID model
- **THEN** the skeleton dropdown SHALL show options like "HUMANOID_DEFAULT", "HUMANOID_CHIBI"

#### Scenario: Change skeleton selection
- **WHEN** the user selects a different skeleton from the dropdown
- **THEN** the right viewport SHALL update to show the new skeleton, and the slot→bone bindings SHALL reset to the new skeleton's defaults

### Requirement: Slot-to-bone binding table
The rig panel SHALL display a table/list of the model's slots (from its archetype). For each slot:
- The slotId SHALL be displayed.
- The currently bound bone(s) SHALL be shown.
- The user SHALL be able to click a slot to select it.
- The user SHALL be able to assign one or more bones from the skeleton to each slot.

#### Scenario: View default bindings
- **WHEN** the rig panel is opened and a skeleton is selected
- **THEN** the binding table SHALL show the skeleton's `defaultBindings` for each slot

#### Scenario: Override a slot binding
- **WHEN** the user selects slot "ARM_L" and assigns bones ["ARM_L_UPPER", "ARM_L_LOWER", "HAND_L"]
- **THEN** the `userData.slotBindings` SHALL be updated with the new assignment

### Requirement: Visual highlighting of selected slot/bone
The rig panel SHALL visually highlight the selected slot and bone:
- The pieces belonging to that slot SHALL be highlighted (emissive glow or color change) in the left viewport.
- When the user selects a bone in the skeleton tree, that bone SHALL be highlighted in the right viewport.
- When a slot is bound to bones, both the slot pieces and bound bones SHALL show a matching color to visualize the relationship.

#### Scenario: Highlight slot pieces
- **WHEN** the user clicks slot "HEAD" in the binding table
- **THEN** all pieces in the HEAD slot SHALL be highlighted in the left viewport

#### Scenario: Highlight bound bone
- **WHEN** the user clicks bone "ARM_R_UPPER" in the skeleton tree
- **THEN** that bone sphere SHALL be highlighted in the right viewport

### Requirement: Animation playback in rig panel
The rig panel SHALL allow playing animations from the model's animation profile or skeleton:
- A list of available animations SHALL be shown.
- Clicking an animation SHALL play it in a loop.
- During playback:
  - The left viewport SHALL show the model animating.
  - The right viewport SHALL show the skeleton animating.
  - Selected slot/bone highlights SHALL follow the animated positions.

#### Scenario: Play idle animation
- **WHEN** the user clicks "idle" in the animation list
- **THEN** both viewports SHALL show synchronized animation playback with the model moving on the left and bones moving on the right

#### Scenario: Highlight follows animation
- **WHEN** slot "ARM_R" is selected and the "attack" animation is playing
- **THEN** the highlight on ARM_R pieces and the corresponding bones SHALL move with the animation

### Requirement: Existing bone overlay preserved
The existing bone visualization (cyan spheres + lines overlaid on the model in the main viewport) SHALL continue to function unchanged. The rig panel is an additional view, not a replacement.

#### Scenario: Toggle bones in main viewport
- **WHEN** the user toggles bone visibility in the main viewport
- **THEN** the cyan bone overlay SHALL appear/disappear as before, independent of the rig panel
