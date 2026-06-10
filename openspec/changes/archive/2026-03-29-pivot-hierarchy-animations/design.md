## Context

The LowPoly64 editor builds 3D characters from JSON definitions as flat lists of primitive meshes inside a THREE.Group. Animations target meshes by name and modify position/rotation/scale. The current flat structure causes all rotations to pivot around the geometry center of each mesh, producing unnatural motion for limb-based animations (walk, wave, attack).

The animation pipeline is: JSON → `buildGroupFromDefinition()` → flat `Group > [Mesh, Mesh, ...]` → `compileAnimation()` creates `AnimationClip` with tracks → `AnimationMixer` plays clips. Export recompiles clips from raw animation definitions stored in `userData.animations`.

Key constraint: everything must remain JSON-loadable with no binary assets or external tools. LLMs generate the JSON, so the format must stay simple and predictable.

## Goals / Non-Goals

**Goals:**
- Pieces with a `pivot` field rotate/scale around that point instead of their geometry center
- Pieces with a `parent` field are nested under the parent piece's PivotGroup, inheriting transforms
- Pieces without `pivot` or `parent` behave exactly as before (no regression)
- GLB export includes the PivotGroup hierarchy with correctly bound animation clips
- JSON export reconstructs `pivot`, `parent`, and local `position` from the internal scene graph
- The editor (selection, gizmos, properties panel) works correctly with PivotGroups
- LLM prompt updated to generate pivot/parent data

**Non-Goals:**
- Skinned meshes, vertex weights, or bone deformation
- Visual bone/skeleton editor in the viewport
- IK (inverse kinematics) or constraint systems
- Backward compatibility with old JSON without pivot (old JSON still works, just no pivot benefit)
- Multi-level nesting beyond 2-3 levels deep

## Decisions

### Decision 1: PivotGroup wrapper pattern

**Choice**: Wrap each piece in a `THREE.Group` (PivotGroup) positioned at the pivot point. The mesh is a child of the PivotGroup with a local offset equal to `position - pivot`.

**Rationale**: This is the standard Three.js pattern for custom rotation origins. It requires zero changes to AnimationMixer or the track compilation — `traverse` finds the PivotGroup by `userData.name`, and Three.js naturally rotates the group (and its child mesh) around the group's local origin.

**Alternatives considered**:
- *Translate geometry vertices*: Would break `geometry.parameters` used by persistence. Also wouldn't work for scale animations.
- *Custom matrix manipulation*: Complex, error-prone, doesn't integrate with Three.js animation system.
- *Bone/SkinnedMesh*: Overkill for rigid low-poly pieces. Would require vertex weights and complicate JSON generation by LLMs.

### Decision 2: Flat-first build with parent re-parenting pass

**Choice**: `buildGroupFromDefinition` creates all PivotGroups as flat children first, then performs a second pass to re-parent pieces that have a `parent` field. This avoids requiring pieces to be in dependency order in the JSON.

**Rationale**: LLMs may output pieces in any order. A two-pass approach decouples JSON ordering from the parent hierarchy. It also makes validation simpler — all pieces exist before we try to link them.

**Alternatives considered**:
- *Require topological sort in JSON*: Fragile, hard for LLMs to guarantee.
- *Recursive descent builder*: More complex code, same result.

### Decision 3: `pivot` in group-space, `position` stays as visual position

**Choice**: In the JSON format, `position` remains the visual position of the piece in group space (where the piece appears), and `pivot` is the rotation origin in group space. The PivotGroup is positioned at `pivot`, and the mesh offset is `position - pivot`. For pieces with `parent`, `position` and `pivot` are relative to the parent's pivot.

**Rationale**: This keeps the JSON intuitive for LLMs — `position` is "where the piece is", `pivot` is "where it rotates from". The internal offset math is an implementation detail.

**Alternatives considered**:
- *Store offset instead of position*: Less intuitive for LLMs, harder to visualize.
- *Pivot as relative to position*: Confusing — "the shoulder is 0.6 units above the arm center" requires mental math.

### Decision 4: PivotGroup marker in userData

**Choice**: PivotGroups are marked with `userData.isPivot = true` and `userData.geometryType` is NOT set (meshes have it). This distinguishes PivotGroups from user-created Groups and from meshes during traversal, serialization, and selection.

**Rationale**: Selection needs to know "this Group is a pivot wrapper, not a user group". Serialization needs to reconstruct `pivot` and `position` from the PivotGroup+Mesh structure. A simple boolean flag is the lightest-weight marker.

### Decision 5: Gizmo attaches to PivotGroup

**Choice**: When a raycast hits a mesh inside a PivotGroup, the transform gizmo attaches to the PivotGroup (not the mesh). The properties panel shows the PivotGroup's position as the piece position.

**Rationale**: Users expect to rotate a piece around its pivot, not its center. The gizmo should reflect this. Moving the PivotGroup moves the piece as a whole (pivot + mesh together), which is the correct behavior.

## Risks / Trade-offs

**[Serialization roundtrip fidelity]** → Reconstructing `pivot` and `position` from PivotGroup+Mesh requires `pivotGroup.position + mesh.position` to recover the original values. Floating point drift is mitigated by rounding (already in `roundArray`). Test with import → export → re-import cycle.

**[Editor manipulation changes piece offsets]** → If a user moves the mesh child (not the PivotGroup), the pivot-to-mesh offset changes. Mitigated by always attaching the gizmo to the PivotGroup, not the mesh.

**[LLM generation quality]** → LLMs may struggle to generate correct `pivot` values. Mitigated by clear documentation in `ask.md` with worked examples, and by making `pivot` optional (defaults to `position`, preserving current behavior).

**[Parent ordering in JSON]** → If a piece references a parent that doesn't exist, the piece falls back to root group. A warning is logged. This is acceptable — LLMs occasionally make typos in names.

**[Double-click group selection]** → Currently double-click selects the parent Group of a mesh. With PivotGroups, the immediate parent is the PivotGroup, not the root Group. Need to traverse up past PivotGroups to find the root Group.
