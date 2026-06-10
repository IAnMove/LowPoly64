## Purpose
Define the required README content that explains the project, setup, and editor workflow.

## Requirements

### Requirement: Project README
The project SHALL include a README.md at the root with: project description, features list, tech stack, setup/run instructions, architecture overview, and usage guide.

#### Scenario: README exists and is complete
- **WHEN** a developer clones the repository
- **THEN** README.md SHALL contain enough information to understand, run, and extend the project

### Requirement: Template creation guide
The README SHALL include a section explaining the template definition format with a documented example.

#### Scenario: Template format documented
- **WHEN** a developer reads the README
- **THEN** they SHALL find a clear explanation of the template object structure with field descriptions and a complete example

### Requirement: AI prompt for template generation
The README SHALL include a ready-to-copy prompt that can be given to an LLM (Claude, GPT, etc.) to generate new template definitions in the correct format.

#### Scenario: Prompt is copy-paste ready
- **WHEN** a user copies the prompt from the README and gives it to an LLM with a description like "create a low-poly tree"
- **THEN** the LLM SHALL produce a valid template definition object that can be pasted directly into the template registry

### Requirement: Architecture documentation
The README SHALL describe the module structure (`src/modules/*.js`), the role of each module, and how data flows between them.

#### Scenario: Module roles documented
- **WHEN** a developer reads the architecture section
- **THEN** they SHALL understand what each module does and how state is shared

