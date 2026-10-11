# Template authoring scripts

These scripts regenerate the base template library in `src/data/templates/**`
(every category except the protected character models listed below) and verify
the result in the real app runtime.

```bash
export PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium   # optional: system browser
mkdir -p .tmp-chrome && export TMPDIR=$PWD/.tmp-chrome  # optional: keep browser temp files off /tmp
scripts/template-authoring/build-all.sh               # regenerate + lint + audit + contact sheets (.tmp-sheets/)
scripts/template-authoring/build-all.sh --no-render   # same, without rendering
node scripts/build-template-thumbnails.mjs            # then refresh public/template-thumbnails
```

- Every script reads its source templates from the pinned commit `SOURCE_COMMIT`
  in `lib.mjs` (`86a4665`), where all colors are still authored as absolute
  colors. That keeps reruns idempotent. If that commit is ever rewritten
  (rebase), point `SOURCE_COMMIT` at a commit that predates the multiply-color
  conversion, or drop `relTemplateColors()` and read from the working tree.
- Vertex and face colors **multiply** the piece color (editor, saved scenes and
  glTF all agree). `vc()` therefore returns light factors (`top: #ffffff`).
- Skeleton clips set absolute rotations on bone pieces: bone pieces carry no
  rest rotation; use an empty `LABEL` joint with the bone name when a tilt is
  needed (see `monsters-cm.mjs` and `characters.mjs`).
- Protected and never regenerated: reference/mold/study character models,
  `n64_elf_hero_cm`, `capture_humanoid`, `n64_simple_villager_cm` (pinned by
  `ask-character.md`) and `generated-character-molds.js`.

Runtime probes (each starts Vite and Chromium):

| Script | Checks |
| --- | --- |
| `anim-probe.mjs [ids]` | clip start pops and loop seams, written to `.tmp-anim-probe.json` |
| `budget-probe.mjs` | the app's 800-triangle / color style budget for every template |
| `map-probe.mjs ids` | bone-to-piece map, node tree and console warnings |
| `tri-probe.mjs ids` | triangles per piece |
