## MODIFIED Requirements

### Requirement: Support repeatable visual review of expanded face presets
The builder SHALL provide a consistent preview workflow for auditing head-related presets from the live app. When the user changes `head shape`, `head mold`, `hair`, `eyes`, `brows`, `nose`, `mouth`, `ears`, or `accessory`, the preview SHALL frame the head area in a centered, comparable front-facing view without deforming the final body result.

#### Scenario: Audit a face preset
- **WHEN** the user selects a head-related preset in `Avatar Forge`
- **THEN** the preview SHALL reframe the avatar to a centered head view suitable for direct comparison

#### Scenario: Keep head review front-facing
- **WHEN** the preview reframes to head review after a head-related selection
- **THEN** the camera SHALL view the avatar from the canonical frontal side rather than the rear side

#### Scenario: Confirm after head review
- **WHEN** the user confirms the avatar after reviewing head-related presets
- **THEN** the resulting scene group SHALL keep the intended body proportions and SHALL NOT inherit temporary preview deformation
