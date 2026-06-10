## ADDED Requirements

### Requirement: Public help page
The project SHALL include a user-facing help page reachable from the main editor UI. The help page SHALL explain the editor workflow, object import flow, animation import flow, and export flow.

#### Scenario: Open help from the editor
- **WHEN** the user clicks the help entry in the editor shell
- **THEN** the browser SHALL open the help page without disrupting the editor codebase

### Requirement: Bilingual help content
The help page SHALL support English and Spanish. Users SHALL be able to read the full documentation in either language.

#### Scenario: Switch help language
- **WHEN** the help page language is changed from English to Spanish
- **THEN** headings, instructions, prompts, and examples SHALL update consistently

### Requirement: LLM-ready prompts for users
The help page SHALL include prompts prepared for external LLMs to generate importable JSON objects and animations for LowPoly64.

#### Scenario: User copies object prompt
- **WHEN** the user copies the object-generation prompt from the help page and sends it to an LLM with an asset description
- **THEN** the prompt SHALL instruct the LLM to return importable JSON in the supported schema
