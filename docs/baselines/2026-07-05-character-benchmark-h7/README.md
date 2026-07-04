# Character Benchmark Gallery H7 - 2026-07-05

Reference captures for the H7 depth-and-atlas benchmark gallery.

Benchmarks:

- `h7_serious_hero`: generated heroic skull, embedded slabs, circlet, layered hair, square guard eyes, heavy brows, and grit mouth.
- `h7_cute_npc`: generated chibi skull, embedded slabs, flower pin, round bangs, wide wonder eyes, soft brows, and big cheer mouth.
- `h7_elder`: generated broad skull, flat-safe slabs, earring, slick hair, teary eyes, worry brows, and moustache-gap mouth.
- `h7_villain`: generated long skull, toy-extruded slabs, tiny horns, slick hair, cat-slit eyes, angry brows, and side-fang mouth.
- `h7_robot`: generated square skull, mask-plate slabs, visor strip, goggle eyes, micro brows, and mask-line mouth.
- `h7_mask_ghost`: generated slim skull, flat-safe slabs, low pony hair, hollow-mask eyes, elf-sweep brows, and soft-o mouth.

Each benchmark has:

- front
- profile
- three-quarter

Capture command:

```powershell
$env:CAPTURE_CHARACTER_BENCHMARK_H7='1'; .\node_modules\.bin\playwright.cmd test tests/e2e/avatar-h7-benchmark-gallery.spec.js --project=smoke --grep "captures H7" --reporter=line --timeout=300000
```

The matching test validates head visibility, five feature slabs, positive slab
depth, no reintroduced `FACE_DECAL`, applied eye/brow/mouth sprite ids, and
hair or accessory bounds.
