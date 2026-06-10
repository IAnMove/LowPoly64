## Purpose
Define the browser-side configuration flow for AI texture generation, including backend selection, persisted settings, and safe handling of local credentials.

## Requirements

### Requirement: Open texture generation configuration from the editor
The system SHALL expose a `CONFIG` entry point in the main editor UI that opens a texture generation settings modal for the current browser session.

#### Scenario: Open the configuration modal
- **WHEN** the user clicks `CONFIG` from the top bar
- **THEN** the system SHALL open the texture generation configuration modal without leaving the editor

### Requirement: Persist backend-specific generation settings in browser storage
The system SHALL persist the selected texture generation method and its backend-specific settings in browser `localStorage` so the workflow survives a reload on the same machine.

#### Scenario: Reopen the editor after saving configuration
- **WHEN** the user saves texture generation settings and later reloads the app
- **THEN** the modal SHALL reopen with the previously selected backend, dimensions, quality, endpoints, and other saved values restored from `localStorage`

### Requirement: Protect the OpenAI API key in the configuration UI
When the OpenAI backend is configured, the system SHALL keep the API key in a password field, SHALL NOT write the saved key back into the DOM as visible text, and SHALL only replace the stored key when the user submits a non-empty new value.

#### Scenario: Open the modal with a saved OpenAI key
- **WHEN** the user has already saved an OpenAI key and reopens `CONFIG`
- **THEN** the key input SHALL remain visually masked and the system SHALL preserve the stored key unless the user enters a replacement

### Requirement: Configure optional local Ollama settings alongside image backends
The configuration modal SHALL expose an optional Ollama endpoint and selected model so prompt enhancement can be configured independently from the image generation backend.

#### Scenario: Save Ollama settings without switching backend
- **WHEN** the user edits the Ollama endpoint or model and saves the modal
- **THEN** the system SHALL persist those Ollama settings without requiring the image backend to change
