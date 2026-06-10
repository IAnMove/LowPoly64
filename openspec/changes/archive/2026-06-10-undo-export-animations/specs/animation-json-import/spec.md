## ADDED Requirements

### Requirement: Animation import via JSON
The system SHALL allow importing animation definitions from JSON text or files. The animation JSON can be applied to the currently selected group. The import modal SHALL have a dedicated section for animation import.

#### Scenario: Import animation to selected group
- **WHEN** user selects a group and imports a valid animation JSON
- **THEN** the animation is added to the group's userData.animations and compiled to a clip

### Requirement: Animation JSON validation
The system SHALL validate animation JSON: `name` must be a string, `duration` must be a positive number, `tracks` must be a non-empty array, each track must have a valid `target` string, `property` must be one of "position"/"rotation"/"scale", and `keyframes` must be a non-empty array with `time` (number) and `value` (array of 3 numbers).

#### Scenario: Invalid property type
- **WHEN** user imports animation JSON with property "color"
- **THEN** the system shows an error: property "color" is not supported

#### Scenario: Missing keyframes
- **WHEN** user imports animation JSON with an empty keyframes array
- **THEN** the system shows an error about missing keyframes

### Requirement: Combined object+animation import
The system SHALL support importing objects with embedded animations when the object JSON includes an optional `animations` array field. Each entry in the array SHALL follow the animation definition format.

#### Scenario: Import object with animations
- **WHEN** user imports object JSON that includes `{ "name": "ROBOT", "pieces": [...], "animations": [...] }`
- **THEN** the group is created with pieces AND animations compiled and attached

### Requirement: ask-animation.md prompt file
The system SHALL include an `ask-animation.md` file with a complete prompt for external LLMs to generate animation JSON, including the schema, supported properties, interpolation behavior, and a full example.

#### Scenario: LLM generates valid animation
- **WHEN** user copies the prompt from ask-animation.md, asks an LLM to create a "breathing" animation, and pastes the result
- **THEN** the JSON validates and the animation plays correctly on the target object
