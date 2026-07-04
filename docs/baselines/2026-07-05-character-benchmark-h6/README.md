# Character Benchmark Gallery H6 - 2026-07-05

Reference captures for the H6.3 multi-character benchmark gallery.

Benchmarks:

- `n64_elf_hero_cm`: generated skull plus five feature slabs.
- `n64_simple_villager_cm`: simple N64 humanoid with legacy sprite `FACE_DECAL`.
- `psx_slim_guard_cm`: PSX slim guard with helmet, spear, and legacy sprite `FACE_DECAL`.
- `n64_cover_mascot_v2_cm`: N64 mascot with textured face card, ears, cap, and overalls.

Each benchmark has:

- front
- profile
- three-quarter

Capture command:

```powershell
$env:CAPTURE_CHARACTER_BENCHMARK='1'; .\node_modules\.bin\playwright.cmd test tests/e2e/character-benchmark-gallery.spec.js --project=smoke --reporter=line --timeout=240000
```

The matching test validates required pieces, head visibility, face detail
presence, and feature-slab depth for slab-based characters.
