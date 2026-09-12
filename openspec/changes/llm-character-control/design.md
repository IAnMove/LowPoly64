## Context

Character Studio and Avatar Forge already construct articulated editable groups. The browser/companion tool bridge works, but success-result sanitization truncates binary strings and deep JSON. The assistant has no semantic character contract or isolated review cycle.

## Goals / Non-Goals

Goals: implement the original PSX swordsman sequence, bounded visual drafts, complete exports, catalog discovery and local/API provider negotiation using the existing registry. Preserve all unrelated manual edits and detect changes made while a draft is open.

Non-goals: promise likeness to a named commercial character, train a model, download local models, add a third geometry engine, or extend animation retargeting in this change. Real-provider quality is reported separately from deterministic integration checks.

## Decisions

- Use a versioned semantic recipe over existing CharacterModel primitives. Strict fields and catalog lookup produce actionable validation instead of silently substituting unknown presets.
- Keep pending groups outside the scene. A draft has a source fingerprint, monotonic revision, up to three corrections and operation IDs. Commit chooses an existing revision and creates one undo action. Repeated operation IDs return their original result; mismatched reuse is rejected.
- Preserve unrelated pieces and their stable IDs when applying a part patch. Head scale acts on the head joint so hand-authored descendants resize together. Persist recipes alongside actual pieces, never replace saved geometry with regeneration.
- Reuse Avatar preview lighting for front/profile/three-quarter images. Structural evaluation reports measurable faults and does not invent a likeness score. The model or human chooses the preferred revision.
- Carry complete artifacts separately from compact observations, with explicit limits and download handling. Treat content as untrusted data without corrupting bytes.
- Normalize provider protocols behind the current runner interface. Local model tools, image and structured-output support are probed independently; unknown or absent vision requires human review, and local failure never selects a cloud service.

## Risks / Trade-offs

- Limited generators constrain likeness → expose supported forms and retain manual editing.
- Concurrent user edits could be overwritten → compare source fingerprint at commit and require a fresh draft after conflict.
- Large artifacts exceed local bridge limits → explicit bounded failures; never present truncated data as an importable file.
- A protocol mock does not establish model quality → document real-service availability and test results separately.
- Drafts occupy GPU memory → bounded counts/revisions, disposal on discard and no persistent renderer per draft.
