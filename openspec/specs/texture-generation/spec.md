## Purpose
Define the AI-assisted texture generation workflow, including backend dispatch, prompt-driven generation, tile-aware editing, and local recovery behavior.

## Requirements

### Requirement: Generate textures through the configured image backend
The system SHALL generate texture images through the configured backend, whether OpenAI Images or a local Stable Diffusion-compatible server, and SHALL apply the result back into the texture editor workflow.

#### Scenario: Generate a texture from the current prompt
- **WHEN** the user launches texture generation from the side panel or the expanded prompt modal
- **THEN** the system SHALL call the configured backend, receive a PNG payload, and apply the generated result to the texture editor canvas

### Requirement: Support shared prompt editing across compact and expanded generation flows
The texture generation workflow SHALL support a compact prompt entry point in the texture editor plus an expanded prompt modal for longer edits, and both entry points SHALL use the same underlying generation pipeline.

#### Scenario: Generate from the expanded prompt modal
- **WHEN** the user opens the expanded prompt modal, edits the prompt, and clicks `GENERATE`
- **THEN** the system SHALL use that updated prompt text for generation and keep the compact workflow synchronized with the same prompt state

### Requirement: Support tile-aware generation and edit operations
When grid mode is active, the system SHALL allow the user to select a tile and apply generation, img2img editing, or clearing only to that selected region; if no tile is selected, the operation SHALL fall back to the full canvas.

#### Scenario: Generate into a selected tile
- **WHEN** the user selects a tile in the sheet navigation and runs `GENERATE INTO TILE`
- **THEN** the generated image SHALL be pasted only into the selected tile region without overwriting the rest of the canvas

#### Scenario: Edit one tile from its current contents
- **WHEN** the user selects a tile and applies a tile edit prompt
- **THEN** the system SHALL use the current tile image as the img2img source and write the edited result back into that tile only

### Requirement: Preserve recoverable local texture backups during editing
The texture workflow SHALL keep recoverable local backups so recent edits can survive accidental closure, and SHALL expose a manual snapshot action for immediate backup outside the scene file.

#### Scenario: Restore a recent texture auto-save
- **WHEN** the user reopens the texture editor on a mesh without a live texture and a recent auto-save exists
- **THEN** the system SHALL restore that recent texture backup automatically

#### Scenario: Save a manual texture snapshot
- **WHEN** the user clicks `SAVE SNAPSHOT` in the texture editor
- **THEN** the system SHALL persist a browser backup and download a PNG copy of the current texture
