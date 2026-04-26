## Why

The current humanoid video-capture pipeline can produce long, skinny generated models and inconsistent animation retargeting because capture rigs, templates, Fast Poser assets, and legacy humanoid skeletons use overlapping but different bone contracts. This change makes the final user outcome explicit: humanoid models should look proportionate, and animations captured from videos should load reliably onto those models.

## What Changes

- Introduce a standard humanoid animation interchange contract based on Fast Poser/Animateur bone names and proportions.
- Keep legacy humanoid templates working through a shared alias/canonical-bone layer while templates migrate gradually.
- Normalize Motion Ripper video output so captured takes can be exported and re-imported as standard animation assets.
- Improve generated capture characters so they use human-looking proportions, rest poses, and retargeted rotations instead of copied capture transforms.
- Prevent animation drift and limb stretching by preserving target rest positions for non-root bones.
- Add verification coverage for Motion Ripper video captures, skinned generated characters, Fast Poser roundtrips, and standard/legacy alias compatibility.

## Capabilities

### New Capabilities
- `video-animation-capture`: Covers recording, normalizing, exporting, and importing humanoid animations derived from video/pose landmarks.

### Modified Capabilities
- `skeleton-registry`: Add a standard humanoid skeleton contract and compatibility expectations for legacy humanoid skeletons.
- `character-model-format`: Define how humanoid model metadata preserves standard skeleton identity, aliases, and animation compatibility.
- `rig-animation-ui`: Require animation import/export and rig playback workflows to support standard humanoid/Fast Poser animation assets.

## Impact

- Affected modules include Motion Ripper capture/import/export, skinned capture character generation, Fast Poser/Animateur import-export, skeleton registry, animation translation, rigging utilities, and representative humanoid templates.
- Existing `HUMANOID_DEFAULT` and `HUMANOID_CAPTURE` assets remain compatible during migration.
- No breaking format removal is allowed until legacy templates and saved captures have explicit compatibility coverage.
