## ADDED Requirements

### Requirement: Transform mode shortcuts
The system SHALL support keyboard shortcuts W (translate), E (rotate), R (scale) to switch TransformControls mode.

#### Scenario: Press W for translate
- **WHEN** the user presses the W key and no text input is focused
- **THEN** TransformControls SHALL switch to "translate" mode

#### Scenario: Press E for rotate
- **WHEN** the user presses the E key and no text input is focused
- **THEN** TransformControls SHALL switch to "rotate" mode

#### Scenario: Press R for scale
- **WHEN** the user presses the R key and no text input is focused
- **THEN** TransformControls SHALL switch to "scale" mode

### Requirement: Delete shortcut
The system SHALL delete the selected object when the user presses the Delete key.

#### Scenario: Press Delete to remove object
- **WHEN** the user presses the Delete key while an object is selected
- **THEN** the selected object SHALL be removed from the scene and selection cleared

#### Scenario: Delete with no selection
- **WHEN** the user presses the Delete key with no object selected
- **THEN** nothing SHALL happen

### Requirement: Duplicate shortcut
The system SHALL duplicate the selected object when the user presses Ctrl+D.

#### Scenario: Ctrl+D duplicates selected object
- **WHEN** the user presses Ctrl+D while an object is selected
- **THEN** a clone of the object SHALL be created at a slight offset (e.g., +1 on X) and the clone SHALL become selected

#### Scenario: Ctrl+D with no selection
- **WHEN** the user presses Ctrl+D with no object selected
- **THEN** nothing SHALL happen

### Requirement: Shortcuts ignore text input focus
All keyboard shortcuts SHALL be suppressed when a text input or number input field is focused, to avoid interfering with typing.

#### Scenario: Typing in name field
- **WHEN** the user types "W" in the name input field
- **THEN** the character SHALL be typed into the field and TransformControls mode SHALL NOT change
