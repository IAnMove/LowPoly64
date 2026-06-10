## MODIFIED Requirements

### Requirement: Raycaster-based selection
The system SHALL use Three.js Raycaster to detect clicks on meshes within the `userObjects` group (recursive). When a clicked mesh is inside a PivotGroup (`parent.userData.isPivot === true`), the system SHALL select the PivotGroup instead of the mesh. Ctrl+Click SHALL add/remove PivotGroups from a multi-selection set. Double-click SHALL select the root Group of the clicked mesh, traversing up past any PivotGroups.

#### Scenario: User clicks on a mesh inside a PivotGroup
- **WHEN** the user clicks on a mesh that is a child of a PivotGroup
- **THEN** the PivotGroup SHALL become the selected object, TransformControls SHALL attach to the PivotGroup, and the properties panel SHALL show the PivotGroup's properties

#### Scenario: User clicks on a mesh without PivotGroup
- **WHEN** the user clicks on a mesh that is a direct child of userObjects (no PivotGroup)
- **THEN** the mesh SHALL be selected directly (current behavior)

#### Scenario: Double-click selects root Group past PivotGroups
- **WHEN** the user double-clicks a mesh inside a PivotGroup that is inside a root Group
- **THEN** the root Group (not the PivotGroup) SHALL be selected

#### Scenario: User clicks on empty space
- **WHEN** the user clicks on an area with no mesh
- **THEN** the current selection (single or multi) SHALL be cleared, TransformControls SHALL detach, and the properties panel SHALL hide
