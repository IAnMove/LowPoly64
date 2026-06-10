# color-picker Specification

## Purpose
TBD - created by archiving change undo-export-animations. Update Purpose after archive.
## Requirements
### Requirement: HTML color picker alongside palette swatches
The system SHALL display a native `<input type="color">` next to the palette swatches in the viewport color zone. The picker SHALL allow the user to choose any arbitrary color beyond the predefined palette.

#### Scenario: Pick custom color
- **WHEN** user clicks the color picker input and selects a color
- **THEN** the selected mesh's material color is updated in real-time as the picker changes

#### Scenario: No selection
- **WHEN** no object is selected and user changes the color picker
- **THEN** nothing happens (no error)

### Requirement: Sync color picker with selected object
The system SHALL synchronize the color picker value with the currently selected object's color. When an object is selected, the picker SHALL update to show that object's current color.

#### Scenario: Select object updates picker
- **WHEN** user clicks on a red cube
- **THEN** the viewport color picker value changes to the cube's red color (#ff0000)

#### Scenario: Palette swatch updates picker
- **WHEN** user clicks a green swatch from the palette
- **THEN** the color picker input also updates to green

### Requirement: Bidirectional sync with properties panel
The system SHALL keep the viewport color picker and the properties panel color input in sync. Changing either SHALL update the other and apply the color to the selected object.

#### Scenario: Change in viewport updates panel
- **WHEN** user picks a color in the viewport color picker
- **THEN** the color input in the properties panel right side also updates

#### Scenario: Change in panel updates viewport
- **WHEN** user changes the color via the properties panel
- **THEN** the viewport color picker also updates

### Requirement: Color change is undoable
Color changes made via the picker or palette SHALL be registered as undoable actions. The undo action SHALL restore the previous color.

#### Scenario: Undo color pick
- **WHEN** user changes color via picker and presses Ctrl+Z
- **THEN** the object's color reverts to the previous color and both pickers update

