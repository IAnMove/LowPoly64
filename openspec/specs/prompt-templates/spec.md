## Purpose
Define the categorized prompt template library used to bootstrap AI texture prompts from the editor UI.

## Requirements

### Requirement: Provide categorized prompt templates for common retro texture jobs
The system SHALL expose curated prompt templates grouped by category for common PS1/N64-style texture tasks such as faces, body parts, ground, walls, and props.

#### Scenario: Browse available prompt categories
- **WHEN** the user opens the prompt template selector
- **THEN** the system SHALL show grouped templates that cover multiple retro texture categories rather than one flat unstructured list

### Requirement: Expose templates in both compact and expanded prompt flows
The template library SHALL be available from the texture editor side panel and from the expanded prompt modal so the user can start from the same prompt vocabulary in either entry point.

#### Scenario: Open template selection from either prompt UI
- **WHEN** the user interacts with the prompt controls from the side panel or the expanded modal
- **THEN** both flows SHALL provide access to the same categorized prompt template set

### Requirement: Apply selected templates as editable prompt starting points
Selecting a prompt template SHALL copy that template into the expanded prompt textarea and reset the selector so the user can refine the prompt before generation.

#### Scenario: Choose a prompt template
- **WHEN** the user picks a template from the selector
- **THEN** the template text SHALL populate the editable expanded prompt field and the selector SHALL return to its empty state
