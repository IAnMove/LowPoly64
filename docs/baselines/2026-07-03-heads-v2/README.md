# Heads v2 Baseline - 2026-07-03

Reference captures for the generated-head-only Avatar Forge pipeline after H0.2.

Source state: commit `29ca7cf` (`Remove legacy avatar head meshes (heads v2, H0.2)`).

## Contents

- `heads/`: 8 generated head presets (`gen_head_*`) in front, profile, and back views.
- `bodies/`: 6 body presets in front, profile, and three-quarter views, using the generated default head path.

Total images: 42 PNG files.

## Commands

PowerShell:

```powershell
$env:CAPTURE_HEADS='1'; .\node_modules\.bin\playwright.cmd test tests/e2e/avatar-head-capture.spec.js --project=smoke --reporter=line --timeout=600000
$env:CAPTURE_BODIES='1'; .\node_modules\.bin\playwright.cmd test tests/e2e/avatar-body-capture.spec.js --project=smoke --reporter=line --timeout=600000
```

The checked-in files copy only `gen_head_*.png` from `.tmp-head-views/avatars/`
and all body captures from `.tmp-head-views/bodies/`.
