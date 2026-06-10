## Purpose
Define the optional Ollama-based prompt enhancement workflow for AI texture generation.

## Requirements

### Requirement: Discover installed Ollama models from a configured endpoint
The system SHALL query the configured Ollama endpoint for installed models and present the discovered names in the configuration UI.

#### Scenario: Load models from Ollama
- **WHEN** the user clicks `LOAD MODELS` in the Ollama section of `CONFIG`
- **THEN** the system SHALL request `{ollamaUrl}/api/tags` and populate the model selector with the returned model names

### Requirement: Enhance prompts through a configured local Ollama model
When an Ollama model is configured, the system SHALL allow the user to enhance the current texture prompt through the local LLM and replace the editable prompt text with the improved result.

#### Scenario: Enhance the current prompt
- **WHEN** the user clicks `ENHANCE` in the expanded prompt modal
- **THEN** the system SHALL send the current prompt to the configured Ollama model and replace the modal textarea contents with the enhanced prompt text

### Requirement: Hide prompt enhancement controls when Ollama is not configured
The prompt enhancement entry point SHALL only be shown when a valid Ollama model is configured for the current browser session.

#### Scenario: Open the prompt modal without an Ollama model
- **WHEN** the user opens the expanded prompt modal and no Ollama model is configured
- **THEN** the `ENHANCE` control SHALL remain hidden
