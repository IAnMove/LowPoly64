## Context

The existing editor builds articulated PivotGroups and compiles HUMANOID_STANDARD animation profiles. Avatar Forge's SVG head path creates excessive geometry; its recipe-only persistence loses manual edits. Custom mesh JSON conversion also drops top-level vertices/faces. GLB export exists but GLB import does not.

## Goals / Non-Goals

Goals: a focused usable PSX/N64 creator; reusable bodies with a HEAD anchor; interchangeable simple heads; JSON recipes and full models; GLB import/export retaining geometry, hierarchy, animation and editable state; reliable save/load.

Non-goals: photorealistic reconstruction, a new general sculpting system, replacing all legacy Avatar Forge art, or smooth skin deformation. Characters use the app's articulated rigid-parts humanoid rig, which exports node animation to standard glTF.

## Decisions

- A pure character recipe/model module generates low-detail CharacterModel data without SVG or Avatar Forge dependencies. Default characters target at most 1200 triangles. Recipe uses format `retrovisor-character`, version 1, style/headStyle, includeHead, proportions, hair and colors.
- A focused studio previews and creates a full character or body only. Bodies retain HEAD as an empty joint. Applying another head replaces only HEAD descendants and updates relevant metadata, preserving body geometry and manual edits.
- Reuse HUMANOID_STANDARD, existing animation profiles and editor pivots. Do not introduce a second rig authoring engine.
- Full JSON is authoritative geometry plus metadata. Recipes are an additional compact creation input. Normalize custom geometry before CharacterModel conversion; preserve recipe, inline animations and root transform.
- Existing avatars save actual children plus recipe; old recipe-only scenes still regenerate on load. New studio characters use ordinary group persistence with recipe metadata.
- GLB loads with GLTFLoader. Native imported scenes retain their actual hierarchy, skins/materials and clips. A versioned `retrovisor-gltf` JSON envelope and scene-persistence object type store a sanitized Three.js object snapshot plus animation clip JSON so save/load and JSON export do not flatten or lose rig data. App-generated GLB retains creator metadata as extras, allowing head reuse after import.
- General GLB import rejects unsupported external resources rather than fetching arbitrary referenced assets; embedded GLB is supported. Bound input size and snapshot resources before parsing. Unlit materials remain unlit on export.

## Risks / Trade-offs

- Rigid-parts rigs are intentionally visible separate segments rather than smooth skinned anatomy; verify actual motion in exported clips.
- Generator changes can overwrite manual changes if applied indiscriminately; head-only replacement preserves the body, and full regeneration is an explicit UI action.
- Imported GLB uses a richer snapshot JSON than hand-authored CharacterModel; central format detection and meaningful import errors keep the user flow consistent.
- Legacy avatar geometry can remain dense; this change guarantees simple geometry for the new creator and repairs data loss without redesigning the old catalog.

## Migration Plan

Add studio as an explicit entry point. Read old JSON and scene data. Save new avatar snapshots with children. No destructive data migration or dependency additions.
