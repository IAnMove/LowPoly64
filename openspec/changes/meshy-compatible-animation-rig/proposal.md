## Why

Retro characters currently animate through rigid pivots, while the supplied Meshy GLB animates 24 actual joints with vertex weights and native quaternion clips. A small compatible rig bridge can reuse those motions without adding a high-detail mesh or replacing the editable character.

## What Changes

- Inspect and document the supplied GLB's bind pose, hierarchy, scale, weights and clips.
- Add a validated adapter for the observed Meshy 24-joint profile.
- Convert a selected PSX/N64 character into a separate skinned animated copy, preserving its appearance and the editable original.
- Fit the compatible skeleton to the target proportions, normalize the target arms to a reference pose, retain quaternion motion and scale hip displacement.
- Add a simple GLB animation-file action and preserve the resulting skin, bones and clips through JSON, GLB and scene persistence.

## Capabilities

### New Capabilities

- `compatible-humanoid-animation`: Create and exchange a skinned retro character using motions from a validated humanoid GLB profile.

### Modified Capabilities

None.

## Impact

New animation adapter and UI module, existing native GLB/persistence/export integration, character action bindings, focused tests and a reverse-engineering report. No new runtime dependencies. Support is limited to the observed profile; arbitrary Meshy/Mixamo rigs and automatic foot-contact correction are outside this initial change.
