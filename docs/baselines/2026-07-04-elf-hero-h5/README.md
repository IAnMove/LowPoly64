# Elf Hero H5 Baseline - 2026-07-04

Reference captures for `n64_elf_hero_cm` after H5.4.

This baseline uses the generated skull plus five facial feature slabs:
`EYE_SLAB_L`, `EYE_SLAB_R`, `BROW_SLAB_L`, `BROW_SLAB_R`, and `MOUTH_SLAB`.
The old `FACE_DECAL` grid is intentionally absent.

Captured views:

- `n64_elf_hero_cm_front.png`
- `n64_elf_hero_cm_profile.png`
- `n64_elf_hero_cm_three-quarter.png`

Capture command:

```powershell
$env:CAPTURE_ELF_HERO='1'; .\node_modules\.bin\playwright.cmd test tests/e2e/n64-elf-hero.spec.js --project=smoke --reporter=line --timeout=240000
```

The matching test asserts the standard rig, five sprite-backed feature slabs,
and basic silhouette checks for ears, hat, tunic, boots, and slab depth.
