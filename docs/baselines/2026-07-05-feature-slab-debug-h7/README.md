# H7 Feature Slab Debug Gallery

Generated on 2026-07-05 for H7.2.

The contact sheet covers `gen_head_heroic`, `gen_head_chibi`,
`gen_head_square`, and `gen_head_wide_jaw` in front, three-quarter, and profile
views with Avatar Forge slab debug enabled. Cyan boxes are eye slabs, yellow
boxes are brow slabs, and pink boxes are mouth slabs.

Regenerate with:

```powershell
$env:CAPTURE_AVATAR_SLAB_DEBUG='1'
.\node_modules\.bin\playwright.cmd test tests/e2e/avatar-feature-slab-debug-capture.spec.js --project=smoke
```
