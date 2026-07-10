# Avatar Feature SVG Contract

Avatar Forge feature SVGs are standalone, editable SVG documents. Their root
element carries the identity needed to return an edited file through the
existing SVG Workbench without guessing its role or mount.

Required root attributes:

| Attribute | Meaning | Example |
| --- | --- | --- |
| `viewBox` | Stable editable coordinate system | `0 0 512 512` |
| `data-rv-feature-version` | Contract version | `1` |
| `data-rv-feature-role` | Avatar family | `ears` |
| `data-rv-feature-key` | Layer inheritance key | `ears` |
| `data-rv-mount-role` | Avatar Forge mount contract | `earPair` |
| `data-rv-parent` | Scene slot used by SVG auto-mount | `HEAD` |
| `data-rv-source-id` | Original catalog preset | `ear_soft_01` |
| `data-rv-source-kind` | Source namespace | `avatar-feature-preset` |
| `data-rv-import` | Existing Workbench rendering route | `layered-plane` |

Child shapes keep their normal `id` and `data-rv-role` attributes. The root
`data-rv-feature-key` and `data-rv-mount-role` values are inherited by SVG
layers during import. Layer directives are normalized to lowercase internally;
the root feature metadata preserves catalog casing.

`exportAvatarFeaturePresetSvg(role, presetId)` exports presets that retain
vector markup and resolves palette placeholders to valid colors. Raster-only
sprite presets are rejected instead of being misrepresented as editable
vectors. `parseAvatarFeatureSvg(markup, expectations)` validates XML, geometry,
viewBox, role, mount, and source identity. `createAvatarFeatureSvgSource()` then
produces a normal SVG Workbench source whose `svgSource.feature` metadata
survives scene persistence and subsequent edits.
