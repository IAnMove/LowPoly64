## Why

Avatar Forge exposes many facial choices but several compose poorly: features can be obscured, too small, detached, or inconsistent with hair/accessory placement. The user needs corrected defaults and a small collection of deliberately authored faces to assess visual quality in the actual app.

## What Changes

- Correct feature placement and hair/accessory composition using actual head surfaces and landmarks.
- Add four original, editable starter faces with new eye, brow and mouth artwork and deliberate proportions.
- Keep existing recipe IDs and manual placement controls usable.
- Capture front, three-quarter and profile evidence, and verify recipe/scene/GLB preservation.
- Extend the 24-bone Meshy animation action to Avatar Forge, preserving textured head attachments and aligning the mold's internal forward axis and limb sides.
- Remove excessive ear tessellation, fix mixed accessory anchors, and allow the app's generated head pieces through JSON validation.

## Capabilities

### New Capabilities
- `avatar-forge-curated-faces`: original face presets with reusable feature artwork, usable default placement, and verified exports.
- `avatar-forge-compatible-rig`: animated copies of standard Forge bodies with preserved facial textures and native interchange.

### Modified Capabilities

None. Placement fixes implement the existing readable-defaults and detached-feature contracts.

## Impact

Avatar builder and head mounting, facial catalogs and sprites, starter preset UI, visual diagnostics and tests. Existing animated retro work remains intact. No external accounts, image service or Meshy upload is required.
