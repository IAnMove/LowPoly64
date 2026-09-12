## Context

The supplied GLB has one skinned mesh, 24 joints (22 weighted), and three moving clips plus a one-key bind-pose clip. Its chain is Hips -> Spine02 -> Spine01 -> Spine, with shoulders and neck descending from Spine. Bone-local distances use an Armature scale of 0.01 while visible geometry is 1.7 units tall. Only Hips translations vary; rotations are quaternions and scales are constant. The retro generator has 19 pivots, and the existing 18-bone capture rig is a separate video-capture path.

## Goals / Non-Goals

Goals: reuse the uploaded profile's motion on PSX/N64 bodies; retain proportions and flat colors; export genuine bones and skin weights; keep the original editable; preserve animation through existing native GLB JSON snapshots.

Non-goals: universal humanoid auto-rigging, fingers/facial rigs, automatic foot IK, editing the skinned copy with the legacy head-swap tool, copying donor textures or detailed mesh.

## Decisions

1. Validate a named 24-joint profile and its actual parent graph. Do not infer compatibility from a brand name. Reject incomplete or differently ordered rigs with a useful error.
2. Build a separate compatible skeleton fitted to a clone of the target body. Normalize arms to a T reference pose without changing the source. Use geometric left/right correspondence: the existing retro L/R labels use the opposite X sides from the supplied source.
3. Preserve source bind orientations using the skin's inverse bind matrices. Compute target local translations from target joint positions and parent bind orientations. Create the missing spine levels, toe joints and unweighted head helpers. Copy native quaternion motion in the matched hierarchy; transfer only the scaled, bind-relative Hips translation. Keep target bone lengths fixed and omit constant scale tracks.
4. Bake the target's current mesh geometry into one vertex-colored SkinnedMesh. Keep limbs/head rigid through single-joint weights; use normalized adjacent spine weights on the torso. No increase in geometric detail is required for the initial compatibility proof. Preserve source geometry and materials by cloning.
5. Store the animated result through the existing native-gltf snapshot path, with raw native clips and provenance metadata. Use a separate source recipe field so the legacy head replacement action is not applied to differently oriented bones.
6. UI selects an editable retro body and a GLB animation file, creates a reversible animated copy, selects it and exposes its clips through the existing timeline.

## Risks / Trade-offs

- Different bind axes or scale conventions -> validate the profile, derive bind transforms, test with both a synthetic skeleton and the actual supplied file.
- Cartoon proportions can cause foot sliding or body intersections -> inspect walking/running/dancing samples; preserve lengths and describe contact correction as future work.
- Hard weighting has visible piece articulation -> appropriate for the retro style; continuous joint topology and blended limb weights can follow separately.
- Generic existing assets can have unsupported textures or missing pivots -> reject unsupported targets without mutating them.

## Migration Plan

Add an optional action; existing files, rigs, creator and animations remain usable. Undo removes the new copy. No migration of saved scenes is required.
