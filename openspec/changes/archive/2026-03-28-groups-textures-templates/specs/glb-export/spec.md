## MODIFIED Requirements

### Requirement: Export scene to GLB
The system SHALL export the entire `userObjects` group to a binary .glb file using GLTFExporter. Textures applied to objects SHALL be embedded in the .glb file.

#### Scenario: Export full scene
- **WHEN** the user clicks "EXPORTAR .GLB"
- **THEN** the system SHALL export all objects in userObjects to a .glb file with embedded textures and trigger a browser download with filename "lowpoly64-scene.glb"

### Requirement: Material compatibility for export
Before exporting, the system SHALL ensure materials are glTF-compatible. MeshBasicMaterial and MeshLambertMaterial SHALL be converted to MeshStandardMaterial equivalents. Textures SHALL have `flipY = false` and `colorSpace = SRGBColorSpace` for correct glTF rendering.

#### Scenario: Lambert material with texture exports correctly
- **WHEN** an object with MeshLambertMaterial and a texture is exported
- **THEN** the .glb file SHALL contain a PBR material with the texture correctly embedded and UV settings (offset, repeat, rotation) preserved

## ADDED Requirements

### Requirement: Texture embedding in GLB
The GLTFExporter SHALL embed texture image data (as PNG or JPEG) inside the binary .glb file, producing a fully self-contained file with no external texture references.

#### Scenario: GLB contains texture data
- **WHEN** the export completes for a scene with textured objects
- **THEN** the .glb file SHALL be openable in Blender or other tools with textures visible without needing separate image files

### Requirement: UV transform preservation in export
The export SHALL preserve texture UV transforms (offset, repeat, rotation) using the glTF KHR_texture_transform extension or by baking the transform into the UV coordinates.

#### Scenario: UV transforms preserved
- **WHEN** an object with texture offset (0.5, 0) and repeat (2, 2) is exported
- **THEN** the .glb file SHALL display the texture with the same offset and repeat when opened in Blender
