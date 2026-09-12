## Context
The character design recipe compiles through the existing CharacterModel generator. Its parts have stable names, world-space pivots and semantic ownership. Existing tests cover interchange, not artistic quality.

## Goals / Non-Goals
Create a visually convincing PSX-inspired Cloud study, then expose its reusable forms. Keep each stage reviewable in real screenshots. This is mesh authoring, not bitmap replacement of the character.

## Decisions
- Add optional profiles so legacy recipes retain their appearance.
- Use lofted low-polygon cross sections and oriented hair tufts, preserving named humanoid pivots.
- Refine the silhouette before facial detail and equipment. Judge front/profile/three-quarter views.
- Keep presentation pose independent from generator dimensions and animation rest transforms.
- Test structural validity, semantic edits and JSON/GLB reopening after the visual pass.

## Risks / Trade-offs
Readability and likeness require visual iteration. Added controls must retain unrelated manual edits; obsolete geometry must not delete attachments. Flat shading and bounded polygon counts remain intentional.
