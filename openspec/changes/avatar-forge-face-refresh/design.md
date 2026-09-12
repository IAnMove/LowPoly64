## Context

Avatar Forge combines generated skull meshes, landmark-mounted facial sprites, SVG nose/ear/accessory pieces, and procedural hair shells. The existing catalog is broad but the first six starter recipes show weak face readability and inconsistent attachment. A working 24-bone Meshy adapter currently accepts the simpler retro studio's solid-color bodies.

## Goals / Non-Goals

Goals: correct reproducible placement faults; provide four visually distinct original faces with reusable eyes, brows and mouths; preserve palettes, manual controls and interchange; verify actual front/profile renders. Explain the rig adoption boundary from local code and current Meshy documentation.

Non-goals: replace every catalog asset, universal automatic rigging, facial expression bones, or imply that Meshy's service preserves externally authored rigs and clips.

## Decisions

1. Keep feature mounting driven by generated landmarks and sampled mesh surfaces. Fix shared placement rules rather than hardcoding offsets for each starter.
2. Author the new eye/brow/mouth artwork as source SVG descriptions and render deterministic small PNG sprites for the current texture pipeline. Keep editable SVG markup in catalog entries. The existing generated contour workflow supplies matching mesh outlines.
3. Offer four complete faces as starter recipes while allowing individual feature selection and palette changes. Retain old IDs and recipes.
4. Use a baseline contact sheet of the existing six starters, then compare corrected and new faces at front, three-quarter and profile angles. Validate texture and geometry preservation after export.
5. Convert standard Forge body aliases to the compatible skeleton while cloning textured facial surfaces as head attachments. Bake the internal -Z mold in the donor's +Z basis and resolve limb sides from actual positions, then restore the visible scene placement. Preserve the editable original and source recipe.
6. Clip scalp triangles at the hairline rather than discarding crossing triangles. Combine the continuous shell with authored front hair. Keep ears un-beveled with bounded curve samples, and separate accessory regions so glasses, clips and earrings do not share one target.
7. Keep native quaternion clips separate from the legacy Euler editor. Native animation authoring, broader humanoid providers and universal donor retargeting remain separate work.

## Risks / Trade-offs

- Curved heads can bury details or expose edge walls -> measure distances to the actual surface and inspect side views.
- Resizing may affect older manual recipes -> preserve user controls and test representative old presets.
- New sprite colors may resist palette replacement -> use explicit tint slots and test recoloring.
- Broad catalog coverage can hide visual faults behind passing schema checks -> require saved render evidence.

## Migration Plan

Additive preset IDs and corrected shared attachment logic. Saved recipes remain readable. The baseline images and existing tests allow comparison.
