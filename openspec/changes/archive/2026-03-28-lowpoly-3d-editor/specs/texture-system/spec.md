## ADDED Requirements

### Requirement: Load texture from file
The system SHALL allow the user to upload an image file and apply it as a texture to the selected object's material.

#### Scenario: Upload and apply texture
- **WHEN** the user selects an image file via the texture upload input
- **THEN** the image SHALL be loaded as a Three.js Texture and applied to the selected object's material.map

### Requirement: Toggle texture on/off
The system SHALL allow enabling or disabling the texture on the selected object without losing the texture data.

#### Scenario: Disable texture
- **WHEN** the user clicks the texture toggle button while a texture is active
- **THEN** the material.map SHALL be set to null but the texture reference SHALL be preserved

#### Scenario: Enable texture
- **WHEN** the user clicks the texture toggle button while texture is disabled but was previously loaded
- **THEN** the previously loaded texture SHALL be re-applied to the material.map

### Requirement: Pixelated filtering mode
The system SHALL support a "pixelated" mode that sets texture filtering to NearestFilter for a retro pixel-art look.

#### Scenario: Enable pixelated mode
- **WHEN** the user activates pixelated mode
- **THEN** the texture's magFilter and minFilter SHALL be set to THREE.NearestFilter

#### Scenario: Disable pixelated mode
- **WHEN** the user deactivates pixelated mode
- **THEN** the texture's magFilter and minFilter SHALL be set to THREE.LinearFilter

### Requirement: Texture needs update flag
After changing texture filtering, the system SHALL set texture.needsUpdate = true and material.needsUpdate = true to ensure the change takes effect.

#### Scenario: Filter change triggers update
- **WHEN** the user toggles pixelated mode
- **THEN** the texture and material SHALL be flagged as needing update
