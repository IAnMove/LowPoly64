## MODIFIED Requirements

### Requirement: Load texture from file
The system SHALL allow the user to upload an image file and apply it as a texture to the selected object's material. The texture SHALL be loaded with `colorSpace = THREE.SRGBColorSpace` and `flipY = false` for glTF compatibility.

#### Scenario: Upload and apply texture
- **WHEN** the user selects an image file via the texture upload input
- **THEN** the image SHALL be loaded as a Three.js Texture with SRGBColorSpace and flipY=false, and applied to the selected object's material.map

## ADDED Requirements

### Requirement: UV offset controls
The system SHALL provide numeric inputs for texture offset X and Y, mapped to `texture.offset.x` and `texture.offset.y`.

#### Scenario: Adjust texture offset
- **WHEN** the user changes the offset X or Y value in the properties panel
- **THEN** the selected object's texture offset SHALL update in real-time

### Requirement: UV repeat controls
The system SHALL provide numeric inputs for texture repeat X and Y, mapped to `texture.repeat.x` and `texture.repeat.y`. The texture wrapS and wrapT SHALL be set to RepeatWrapping.

#### Scenario: Adjust texture repeat
- **WHEN** the user changes the repeat X or Y value in the properties panel
- **THEN** the selected object's texture repeat SHALL update and the texture SHALL tile accordingly

### Requirement: UV rotation control
The system SHALL provide a numeric input for texture rotation (in degrees), mapped to `texture.rotation` (converted to radians). The texture center SHALL be set to (0.5, 0.5) for rotation around center.

#### Scenario: Rotate texture
- **WHEN** the user changes the texture rotation value
- **THEN** the texture SHALL rotate around its center by the specified degrees

### Requirement: Texture preview in panel
The properties panel SHALL show a small thumbnail preview of the currently applied texture.

#### Scenario: Preview shown
- **WHEN** an object with a texture is selected
- **THEN** a thumbnail of the texture image SHALL be displayed in the properties panel texture section

#### Scenario: No texture
- **WHEN** an object without a texture is selected
- **THEN** the texture preview area SHALL show "Sin textura" or be empty

### Requirement: UV controls sync on selection
When selecting an object that has a texture, the UV controls SHALL populate with the current offset, repeat, and rotation values.

#### Scenario: UV values populated on selection
- **WHEN** the user selects an object with a texture that has offset (0.5, 0), repeat (2, 2), rotation 45
- **THEN** the UV control inputs SHALL show those values

### Requirement: Clear texture loading UX
The texture upload section in the properties panel SHALL have a prominent "CARGAR TEXTURA" styled button (not just a bare file input) and a drag-and-drop visual hint. When no texture is loaded, it SHALL display "Arrastra una imagen o haz clic para cargar".

#### Scenario: Texture upload is visually clear
- **WHEN** an object is selected and the user looks at the texture section
- **THEN** they SHALL see a clear call-to-action button/area for loading a texture, not just a raw file input

#### Scenario: Drag and drop texture
- **WHEN** the user drags an image file onto the texture upload area
- **THEN** the texture SHALL be loaded and applied to the selected object
