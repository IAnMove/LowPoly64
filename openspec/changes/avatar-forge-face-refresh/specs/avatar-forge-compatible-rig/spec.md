## ADDED Requirements

### Requirement: Compatible animation copies preserve Avatar Forge faces
The compatible GLB animation action SHALL accept editable Avatar Forge humanoids using the standard body hierarchy. Conversion SHALL preserve facial textures, UVs, transparency and their attachment to the head, and SHALL keep the original avatar available for recipe editing.

#### Scenario: Animate a curated face with a supported donor
- **WHEN** a user selects an Avatar Forge character and loads a donor using the supported Meshy humanoid hierarchy
- **THEN** a separate character SHALL play the donor's motion with its face attached to the animated head
- **AND** its animated GLB and JSON exports SHALL retain the skin, clips and textured features

#### Scenario: Unsupported textured body
- **WHEN** a body uses unsupported textured attachments outside the head
- **THEN** conversion SHALL explain the unsupported part without modifying the original character
